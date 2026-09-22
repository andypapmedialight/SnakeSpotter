import os
import tempfile
import unittest
from datetime import datetime, timezone

os.environ["ADMIN_PASSWORD"] = "test-admin-pass"
os.environ["GOOGLE_MAPS_API_KEY"] = ""
os.environ["DATABASE_PATH"] = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name

from fastapi.testclient import TestClient

from app.area import CENTER_LAT, CENTER_LNG
from app.db import init_db
from app.main import app


def _payload(**overrides):
    body = {
        "species": "Tiger snake",
        "notes": "Test pin",
        "observed_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "latitude": CENTER_LAT,
        "longitude": CENTER_LNG,
    }
    body.update(overrides)
    return body


class AdminModerationTests(unittest.TestCase):
    def setUp(self):
        init_db()
        self.client = TestClient(app)

    def test_config_shows_admin_enabled(self):
        data = self.client.get("/api/config").json()
        self.assertTrue(data["admin_enabled"])

    def test_delete_requires_sign_in(self):
        created = self.client.post("/api/sightings", json=_payload()).json()
        response = self.client.delete(f"/api/sightings/{created['id']}")
        self.assertEqual(response.status_code, 401)

    def test_wrong_password_is_rejected(self):
        response = self.client.post("/api/admin/login", json={"password": "nope"})
        self.assertEqual(response.status_code, 401)
        self.assertFalse(self.client.get("/api/admin/session").json()["signed_in"])

    def test_signed_in_admin_can_delete(self):
        created = self.client.post("/api/sightings", json=_payload(species="Unsure")).json()
        login = self.client.post("/api/admin/login", json={"password": "test-admin-pass"})
        self.assertEqual(login.status_code, 200)
        self.assertTrue(self.client.get("/api/admin/session").json()["signed_in"])
        deleted = self.client.delete(f"/api/sightings/{created['id']}")
        self.assertEqual(deleted.status_code, 204)
        missing = self.client.get(f"/api/sightings/{created['id']}")
        self.assertEqual(missing.status_code, 404)

    def test_logout_blocks_further_deletes(self):
        created = self.client.post("/api/sightings", json=_payload()).json()
        self.client.post("/api/admin/login", json={"password": "test-admin-pass"})
        self.client.post("/api/admin/logout")
        self.assertFalse(self.client.get("/api/admin/session").json()["signed_in"])
        response = self.client.delete(f"/api/sightings/{created['id']}")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
