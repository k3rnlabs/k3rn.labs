from __future__ import annotations

from collections import deque

from fastapi.testclient import TestClient

from app.engine import FaceObservation
from app.main import create_app


class FakeEngine:
    def __init__(self, observations: list[list[FaceObservation]]) -> None:
        self._observations = deque(observations)

    def observe(self, encoded_image: bytes) -> list[FaceObservation]:
        assert encoded_image == b"image"
        return self._observations.popleft()


def face(embedding: tuple[float, ...]) -> FaceObservation:
    return FaceObservation(
        confidence=0.99,
        box=(10.0, 20.0, 110.0, 140.0),
        embedding=embedding,
    )


def configure(monkeypatch) -> None:
    monkeypatch.setenv("MIRAVA_FACE_GATE_THRESHOLD", "0.8")
    monkeypatch.setenv("MIRAVA_FACE_SERVICE_TOKEN", "secret")
    monkeypatch.setenv("MIRAVA_FACE_MODEL_VERSION", "1.0")
    monkeypatch.setenv("MIRAVA_FACE_MODEL_DIGEST", "sha256:test")
    monkeypatch.setenv(
        "MIRAVA_FACE_PREPROCESSING_VERSION", "mirava-auraface-align-v1"
    )


def request(client: TestClient, token: str = "secret"):
    return client.post(
        "/v1/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "identityManifestVersion": "manifest-1",
            "requestId": "request-1",
        },
        files=[
            ("candidate", ("candidate.png", b"image", "image/png")),
            ("references", ("front.png", b"image", "image/png")),
            ("references", ("angle.png", b"image", "image/png")),
            ("references", ("profile.png", b"image", "image/png")),
        ],
    )


def test_calibrated_pass_returns_no_embedding(monkeypatch) -> None:
    configure(monkeypatch)
    engine = FakeEngine(
        [
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((0.9, 0.1))],
            [face((0.8, 0.2))],
        ]
    )
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "PASS"
    assert body["candidateFace"]["count"] == 1
    assert "embedding" not in str(body).lower()


def test_multiple_candidate_faces_are_unscorable(monkeypatch) -> None:
    configure(monkeypatch)
    engine = FakeEngine([[face((1.0, 0.0)), face((0.0, 1.0))]])
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    assert response.json()["decision"] == "UNSCORABLE"
    assert response.json()["reasonCode"] == "CANDIDATE_MULTIPLE_FACES"


def test_invalid_token_is_rejected_before_inference(monkeypatch) -> None:
    configure(monkeypatch)
    engine = FakeEngine([])
    with TestClient(create_app(engine)) as client:
        response = request(client, token="wrong")

    assert response.status_code == 401
