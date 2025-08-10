import pytest
from app.r2_service import R2Service


@pytest.mark.asyncio
async def test_adapter_uses_shopify(monkeypatch):
    # Ensure env does not require R2
    monkeypatch.delenv("ASSETS_BACKEND", raising=False)

    # Provide minimal Shopify env to construct the service
    monkeypatch.setenv("SHOPIFY_STORE_DOMAIN", "example.myshopify.com")
    monkeypatch.setenv("SHOPIFY_ADMIN_ACCESS_TOKEN", "shpat_test")
    monkeypatch.setenv("SHOPIFY_API_VERSION", "2025-07")

    # Stub ShopifyFilesService methods to avoid network
    import app.r2_service as r2_mod
    monkeypatch.setattr(r2_mod, "ShopifyFilesService", lambda: _FakeShopify())

    svc = R2Service()
    fid = await svc.upload_file("req123", b"data", "pic.png")
    assert fid.startswith("gid://shopify/File/")
    assert await svc.delete_file(fid) is True
    url = svc.get_signed_url(fid, 60)
    assert url.endswith("/pic.png")


class _FakeShopify:
    async def upload_file(self, request_id, file_content, filename):
        return "gid://shopify/File/123"

    async def delete_file(self, file_key):
        return True

    def get_signed_url(self, file_key, expiration):
        return "https://cdn.shopify.com/pic.png"

