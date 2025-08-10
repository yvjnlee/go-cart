import io
import os
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from main import app as fastapi_app


def _env_ok() -> bool:
    # Require explicit opt-in and necessary R2 and DB env
    if os.getenv("RUN_PROD_INTEGRATION") != "1":
        return False
    required = [
        "R2_ENDPOINT_URL",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "DATABASE_URL",
    ]
    return all(os.getenv(k) for k in required)


@pytest.mark.prod_integration
@pytest.mark.skipif(not _env_ok(), reason="Set RUN_PROD_INTEGRATION=1 and provide R2_* and DATABASE_URL env vars")
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
        file = ("prod_it.txt", io.BytesIO(file_bytes), "text/plain")
        upload = await client.post(
            "/request-assets/upload",
            files={"file": file},
            data={"request_id": created_request_id},
        )
        assert upload.status_code == 200
        body_upload = upload.json()
        assert body_upload["request_id"] == created_request_id
        assert body_upload["url"].endswith(".txt")

        # Cleanup: delete asset (should also delete from R2), then delete request
        request_asset_id = body_upload["request_asset_id"]
        del_asset = await client.delete(f"/request-assets/{request_asset_id}")
        assert del_asset.status_code == 200

        del_req = await client.delete(f"/requests/{created_request_id}")
        assert del_req.status_code == 200

