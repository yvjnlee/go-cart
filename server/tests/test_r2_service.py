import os
import pytest

from app.r2_service import R2Service


class DummyS3Client:
    def __init__(self):
        self.put_calls = []
        self.delete_calls = []

    def put_object(self, Bucket, Key, Body, ContentType, ACL):
        self.put_calls.append({
            "Bucket": Bucket,
            "Key": Key,
            "Body": Body,
            "ContentType": ContentType,
            "ACL": ACL,
        })

    def delete_object(self, Bucket, Key):
        self.delete_calls.append({"Bucket": Bucket, "Key": Key})

    def generate_presigned_url(self, operation, Params, ExpiresIn):
        return f"https://example.com/{Params['Bucket']}/{Params['Key']}?expires={ExpiresIn}"


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://r2.example.com")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_BUCKET_NAME", "bucket")
    monkeypatch.setenv("R2_PUBLIC_URL_BASE", "https://cdn.example.com")


def test_upload_and_delete_and_signed_url(monkeypatch):
    dummy = DummyS3Client()
    # Patch boto3.client used inside R2Service.__init__ to return our dummy
    import app.r2_service as r2_mod
    monkeypatch.setattr(r2_mod.boto3, "client", lambda *args, **kwargs: dummy)

    svc = R2Service()

    # Upload
    import asyncio
    file_key = asyncio.get_event_loop().run_until_complete(
        svc.upload_file("req123", b"data", "pic.png")
    )
    assert file_key.startswith("request-assets/req123/")
    assert len(dummy.put_calls) == 1
    assert dummy.put_calls[0]["Bucket"] == "bucket"
    assert dummy.put_calls[0]["ContentType"] == "image/png"

    # Signed URL
    signed = svc.get_signed_url(file_key, expiration=123)
    assert "expires=123" in signed

    # Delete
    ok = asyncio.get_event_loop().run_until_complete(svc.delete_file(file_key))
    assert ok is True
    assert len(dummy.delete_calls) == 1

