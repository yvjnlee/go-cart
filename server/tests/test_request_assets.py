import io
import uuid
import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from httpx import ASGITransport

from main import app as fastapi_app
from app.routers.request_assets import router as request_assets_router
from app.database import get_db
from app.r2_service import get_r2_service


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
        if "FROM request_assets WHERE request_id = $1" in query:
            request_id = args[0]
            assets = [a for a in self.request_assets.values() if a["request_id"] == request_id]
            # ORDER BY created_at DESC simulated by insertion order (latest last)
            return list(reversed(assets))
        if "FROM request_assets ORDER BY created_at DESC" in query:
            return list(reversed(list(self.request_assets.values())))
        return []

    async def execute(self, query: str, *args):
        if query.strip().startswith("INSERT INTO request_assets"):
            request_asset_id, request_id, url, created_at, updated_at = args
            self.request_assets[request_asset_id] = {
                "request_asset_id": request_asset_id,
                "request_id": request_id,
                "url": url,
                "created_at": created_at,
                "updated_at": updated_at,
            }
            return "INSERT 0 1"
        if query.strip().startswith("DELETE FROM request_assets"):
            request_asset_id = args[0]
            existed = request_asset_id in self.request_assets
            self.request_assets.pop(request_asset_id, None)
            return "DELETE 1" if existed else "DELETE 0"
        if query.strip().startswith("UPDATE request_assets SET"):
            # Minimal update simulation
            # The first arg is request_asset_id, rest are values assigned in SET clause earlier
            request_asset_id = args[0]
            if request_asset_id not in self.request_assets:
                return "UPDATE 0"
            return "UPDATE 1"
        return ""

    async def close(self):
        return


class FakeR2Service:
    def __init__(self):
        self.uploaded = []
        self.deleted = []

    async def upload_file(self, request_id: str, file_content: bytes, filename: str) -> str:
        file_id = str(uuid.uuid4())
        # Preserve extension if any
        ext = ""
        if "." in filename:
            ext = "." + filename.split(".")[-1]
        url = f"https://cdn.test/request-assets/{request_id}/{file_id}{ext}"
        self.uploaded.append({
            "request_id": request_id,
            "filename": filename,
            "size": len(file_content),
            "url": url,
        })
        return url

    async def delete_file(self, url: str) -> bool:
        self.deleted.append(url)
        return True

    def get_signed_url(self, url: str, expiration: int = 3600) -> str:
        return f"{url}?signed=1&expires={expiration}"


@pytest.fixture
def app_overridden():
    fake_db = FakeDB()
    # Pre-populate a request
    existing_request_id = str(uuid.uuid4())
    fake_db.requests[existing_request_id] = {"request_id": existing_request_id}

    fake_r2 = FakeR2Service()

    async def override_get_db():
        yield fake_db

    def override_get_r2_service():
        return fake_r2

    fastapi_app.dependency_overrides[get_db] = override_get_db
    fastapi_app.dependency_overrides[get_r2_service] = override_get_r2_service

    try:
        yield fastapi_app, fake_db, fake_r2, existing_request_id
    finally:
        fastapi_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_upload_asset_success(app_overridden):
    app, fake_db, fake_r2, request_id = app_overridden

    file_bytes = b"hello world"
    file = ("test.txt", io.BytesIO(file_bytes), "text/plain")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/request-assets/upload",
            files={
                "file": file,
            },
            data={"request_id": request_id},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["request_id"] == request_id
    assert data["url"].startswith(f"https://cdn.test/request-assets/{request_id}/")
    assert len(fake_r2.uploaded) == 1


@pytest.mark.asyncio
async def test_upload_asset_missing_request(app_overridden):
    app, _, _, _ = app_overridden

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/request-assets/upload",
            files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")},
            data={"request_id": str(uuid.uuid4())},
        )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Request not found"


@pytest.mark.asyncio
async def test_upload_asset_empty_file(app_overridden):
    app, _, _, request_id = app_overridden

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/request-assets/upload",
            files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
            data={"request_id": request_id},
        )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Empty file provided"


@pytest.mark.asyncio
async def test_upload_asset_dummy_image(app_overridden):
    app, _, fake_r2, request_id = app_overridden

    # Minimal PNG-like bytes
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    file = ("dummy.png", io.BytesIO(png_bytes), "image/png")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/request-assets/upload",
            files={"file": file},
            data={"request_id": request_id},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["request_id"] == request_id
    assert data["url"].endswith(".png")
    assert fake_r2.uploaded[-1]["filename"] == "dummy.png"
    assert fake_r2.uploaded[-1]["size"] == len(png_bytes)

@pytest.mark.asyncio
async def test_delete_request_asset_calls_r2(app_overridden):
    app, fake_db, fake_r2, request_id = app_overridden

    # Seed an asset
    asset_id = str(uuid.uuid4())
    url = f"https://cdn.test/request-assets/{request_id}/{asset_id}.png"
    fake_db.request_assets[asset_id] = {
        "request_asset_id": asset_id,
        "request_id": request_id,
        "url": url,
        "created_at": None,
        "updated_at": None,
    }

    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.delete(f"/request-assets/{asset_id}")

    assert resp.status_code == 200
    assert any(d == url for d in fake_r2.deleted)
    assert asset_id not in fake_db.request_assets

