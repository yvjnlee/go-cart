import os
import mimetypes
from typing import Optional

import httpx
import time
from fastapi import HTTPException
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


class ShopifyFilesService:
    """Service for uploading and managing files using Shopify Admin GraphQL API.

    This implements the same public interface used by `R2Service` so it can be
    swapped in via dependency injection without changing routers:
      - async upload_file(request_id, file_content, filename) -> str (returns file ID)
      - async delete_file(file_key) -> bool
      - get_signed_url(file_key, expiration=3600) -> str
    """

    def __init__(self) -> None:
        self.store_domain: str = os.getenv("SHOPIFY_STORE_DOMAIN", "").strip()
        self.access_token: str = os.getenv("SHOPIFY_ADMIN_ACCESS_TOKEN", "").strip()
        self.api_version: str = os.getenv("SHOPIFY_API_VERSION", "2025-07").strip()

        if not self.store_domain or not self.access_token:
            raise ValueError(
                "Missing required Shopify env: SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN"
            )

        # Normalize domain, allow user to pass with or without protocol
        self.store_domain = self.store_domain.replace("https://", "").replace("http://", "")
        self.graphql_url = f"https://{self.store_domain}/admin/api/{self.api_version}/graphql.json"

    def _detect_mime(self, filename: str) -> str:
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or "application/octet-stream"

    def _file_content_type_enum(self, mime: str) -> str:
        if mime.startswith("image/"):
            return "IMAGE"
        if mime.startswith("video/"):
            return "VIDEO"
        # Fallback for documents/other types
        return "FILE"

    async def _graphql(self, query: str, variables: dict) -> dict:
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.access_token,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(self.graphql_url, json={"query": query, "variables": variables}, headers=headers)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=f"Shopify GraphQL error: {resp.text}")
            data = resp.json()
            if "errors" in data and data["errors"]:
                raise HTTPException(status_code=500, detail=f"Shopify GraphQL returned errors: {data['errors']}")
            return data.get("data", {})

    async def upload_file(self, request_id: str, file_content: bytes, filename: str) -> str:
        if not filename:
            raise HTTPException(status_code=400, detail="Filename required")
        if not file_content:
            raise HTTPException(status_code=400, detail="Empty file provided")

        mime = self._detect_mime(filename)
        size_bytes = len(file_content)

        # 1) Create staged upload target
        staged_mutation = (
            "mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {"
            "  stagedUploadsCreate(input: $input) {"
            "    stagedTargets { url resourceUrl parameters { name value } }"
            "    userErrors { field message }"
            "  }"
            "}"
        )
        staged_input = [{
            "resource": "FILE",
            "filename": filename,
            "mimeType": mime,
            "httpMethod": "POST",
            # UnsignedInt64 must be encoded as string per Shopify GraphQL schema
            "fileSize": str(size_bytes),
        }]

        staged_data = await self._graphql(staged_mutation, {"input": staged_input})
        staged = staged_data.get("stagedUploadsCreate", {})
        if not staged or staged.get("userErrors"):
            raise HTTPException(status_code=400, detail=f"stagedUploadsCreate errors: {staged.get('userErrors')}")

        targets = staged.get("stagedTargets") or []
        if not targets:
            raise HTTPException(status_code=500, detail="No staged upload target returned by Shopify")

        target = targets[0]
        upload_url: str = target["url"]
        resource_url: str = target["resourceUrl"]
        parameters = {p["name"]: p["value"] for p in target.get("parameters", [])}

        # 2) Upload bytes to staged URL (S3/GCS) using provided form fields
        async with httpx.AsyncClient(timeout=120) as client:
            # NOTE: S3 expects fields as form-data plus the file field named 'file'
            form_fields = parameters
            files = {"file": (filename, file_content, mime)}
            upload_resp = await client.post(upload_url, data=form_fields, files=files)
            if upload_resp.status_code not in (200, 201, 204):
                raise HTTPException(
                    status_code=500,
                    detail=f"Staged upload failed with status {upload_resp.status_code}: {upload_resp.text}",
                )

        # 3) Create the File in Shopify using the staged resource URL
        file_create_mutation = (
            "mutation fileCreate($files: [FileCreateInput!]!) {"
            "  fileCreate(files: $files) {"
            "    files { id fileStatus"
            "      ... on MediaImage { image { url } }"
            "      ... on GenericFile { url }"
            "      ... on Video { sources { url } }"
            "    }"
            "    userErrors { field message code }"
            "  }"
            "}"
        )
        content_type_enum = self._file_content_type_enum(mime)
        alt_text = f"request:{request_id} filename:{filename}"
        file_input = [{
            "alt": alt_text,
            "contentType": content_type_enum,
            "originalSource": resource_url,
        }]

        create_data = await self._graphql(file_create_mutation, {"files": file_input})
        payload = create_data.get("fileCreate", {})
        if payload.get("userErrors"):
            raise HTTPException(status_code=400, detail=f"fileCreate errors: {payload.get('userErrors')}")

        created_files = payload.get("files") or []
        if not created_files:
            raise HTTPException(status_code=500, detail="fileCreate returned no files")

        file_id: str = created_files[0]["id"]
        print(created_files)
        # We store the Shopify file ID as the "file_key"
        return file_id

    async def delete_file(self, file_key: str) -> bool:
        # file_key is a Shopify File ID (gid://...). If it's not a gid, treat as no-op.
        if not file_key or not str(file_key).startswith("gid://"):
            return True
        mutation = (
            "mutation fileDelete($ids: [ID!]!) {"
            "  fileDelete(fileIds: $ids) { deletedFileIds userErrors { message code } }"
            "}"
        )
        data = await self._graphql(mutation, {"ids": [file_key]})
        # Consider deletion successful if the ID appears or no hard errors thrown
        _ = data.get("fileDelete", {})
        return True

    def get_signed_url(self, file_key: str, expiration: int = 3600) -> str:
        """Return the current public URL for the Shopify File ID.

        Shopify file URLs are already CDN-hosted and don't need signing; we fetch
        the best available URL. This method is sync to match the R2Service API
        used in routers.
        """
        # Use a short-lived client for this sync method
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.access_token,
        }
        query = (
            "query fileById($id: ID!) {"
            "  node(id: $id) { id"
            "    ... on MediaImage { fileStatus image { url } }"
            "    ... on GenericFile { fileStatus url }"
            "    ... on Video { fileStatus sources { url } }"
            "  }"
            "}"
        )
        try:
            with httpx.Client(timeout=30) as client:
                # Poll briefly for READY url because file processing is async
                attempts = 6
                for i in range(attempts):
                    resp = client.post(self.graphql_url, json={"query": query, "variables": {"id": file_key}}, headers=headers)
                    print(resp.text)
                    if resp.status_code >= 400:
                        raise HTTPException(status_code=resp.status_code, detail=f"Shopify GraphQL error: {resp.text}")
                    body = resp.json()
                    if "errors" in body and body["errors"]:
                        # If the node isn't visible yet, retry; otherwise fail
                        if i < attempts - 1:
                            time.sleep(0.3 * (i + 1))
                            continue
                        raise HTTPException(status_code=500, detail=f"Shopify GraphQL returned errors: {body['errors']}")
                    node = (body.get("data") or {}).get("node") or {}
                    if not node:
                        if i < attempts - 1:
                            time.sleep(0.3 * (i + 1))
                            continue
                        raise HTTPException(status_code=404, detail="File not found for given ID")

                    # Prefer direct url field if available (GenericFile)
                    if isinstance(node, dict) and isinstance(node.get("url"), str):
                        return node["url"]
                    # MediaImage
                    image = node.get("image") if isinstance(node, dict) else None
                    if image and isinstance(image.get("url"), str):
                        return image["url"]
                    # Video sources
                    sources = node.get("sources") if isinstance(node, dict) else None
                    if isinstance(sources, list) and sources:
                        first = sources[0]
                        if isinstance(first, dict) and isinstance(first.get("url"), str):
                            return first["url"]

                    # If not available yet, wait a bit and retry
                    time.sleep(0.3 * (i + 1))
                raise HTTPException(status_code=404, detail="File URL not found for given ID")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to resolve Shopify file URL: {str(e)}")

