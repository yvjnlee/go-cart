import io
import os
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from main import app as fastapi_app
from app.database import get_db


REQUIRED_ENV_VARS = [
    "R2_ENDPOINT_URL",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
]


def _r2_env_available() -> bool:
    return all(os.getenv(k) for k in REQUIRED_ENV_VARS)


class FakeDB:
    def __init__(self):
        self.requests = {}
        self.request_assets = {}

    async def fetchrow(self, query: str, *args):
        if "FROM requests WHERE request_id = $1" in query:
            request_id = args[0]
            return {"request_id": request_id} if request_id in self.requests else None
        if "FROM request_assets WHERE request_asset_id = $1" in query:
            request_asset_id = args[0]
            asset = self.request_assets.get(request_asset_id)
            return asset.copy() if asset else None
        return None

    async def fetch(self, query: str, *args):
        return []

    async def execute(self, query: str, *args):
        if query.strip().startswith("INSERT INTO request_assets"):
            request_asset_id, request_id, file_key, created_at, updated_at = args
            self.request_assets[request_asset_id] = {
                "request_asset_id": request_asset_id,
                "request_id": request_id,
                "file_key": file_key,
                "created_at": created_at,
                "updated_at": updated_at,
            }
            return "INSERT 0 1"
        if query.strip().startswith("DELETE FROM request_assets"):
            request_asset_id = args[0]
            self.request_assets.pop(request_asset_id, None)
            return "DELETE 1"
        return ""

    async def close(self):
        return


@pytest.mark.integration
@pytest.mark.skipif(not _r2_env_available(), reason="R2 env vars not set; integration test requires real R2")
@pytest.mark.asyncio
async def test_real_r2_upload_and_delete():
    # Use real R2 service; only override DB
    fake_db = FakeDB()
    request_id = str(uuid.uuid4())
    fake_db.requests[request_id] = {"request_id": request_id}

    async def override_get_db():
        yield fake_db

    # clear any previous overrides and set only DB
    fastapi_app.dependency_overrides.clear()
    fastapi_app.dependency_overrides[get_db] = override_get_db

    try:
        file_bytes = b"integration test file"
        file = ("it.txt", io.BytesIO(file_bytes), "text/plain")

        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as client:
            # Upload
            resp = await client.post(
                "/request-assets/upload",
                files={"file": file},
                data={"request_id": request_id},
            )
            assert resp.status_code == 200
            body = resp.json()
            assert body["request_id"] == request_id
            assert "request-assets/" in body["url"]
            assert body["url"].split("?")[0].endswith(".txt")

            # Cleanup: delete from API (which should delete from R2)
            request_asset_id = body["request_asset_id"]
            del_resp = await client.delete(f"/request-assets/{request_asset_id}")
            assert del_resp.status_code == 200
    finally:
        fastapi_app.dependency_overrides.clear()

