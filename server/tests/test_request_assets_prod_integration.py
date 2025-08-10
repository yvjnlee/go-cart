import io
import os
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from main import app as fastapi_app


def _env_ok() -> bool:
    # Require explicit opt-in and necessary Shopify and DB env
    if os.getenv("RUN_PROD_INTEGRATION") != "1":
        return False
    required = [
        "SHOPIFY_STORE_DOMAIN",
        "SHOPIFY_ADMIN_ACCESS_TOKEN",
        "DATABASE_URL",
    ]
    return all(os.getenv(k) for k in required)


@pytest.mark.prod_integration
@pytest.mark.skipif(not _env_ok(), reason="Set RUN_PROD_INTEGRATION=1 and provide Shopify and DATABASE_URL env vars")
@pytest.mark.asyncio
async def test_prod_upload_and_cleanup_real_services():
    request_id = str(uuid.uuid4())

    # First create the request via API to satisfy FK constraints
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as client:
        create_req = await client.post(
            "/requests/",
            json={"shopify_user_id": "it-user", "query": "prod-int-test"},
        )
        assert create_req.status_code == 200
        body_req = create_req.json()
        created_request_id = body_req["request_id"]

        # Upload a small text file
        file_bytes = b"prod integration test file"
        file = ("prod_it.png", io.BytesIO(file_bytes), "image/jpeg")
        upload = await client.post(
            "/request-assets/upload",
            files={"file": file},
            data={"request_id": created_request_id},
        )
        print(upload.text)
        assert upload.status_code == 200

        # Fetch asset list for this request and validate presigned URL from list
        list_resp = await client.get("/request-assets/", params={"request_id": created_request_id})
        assert list_resp.status_code == 200
        assets = list_resp.json()
        assert isinstance(assets, list)
        assert len(assets) >= 1
        print(assets)
        asset_from_list = assets[0]
        assert asset_from_list["request_id"] == created_request_id
        assert asset_from_list["url"].startswith("https://")

        # Cleanup: delete asset (should also delete from Shopify), then delete request
        request_asset_id = asset_from_list["request_asset_id"]
        del_asset = await client.delete(f"/request-assets/{request_asset_id}")
        assert del_asset.status_code == 200

        del_req = await client.delete(f"/requests/{created_request_id}")
        assert del_req.status_code == 200

