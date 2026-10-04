from fastapi.testclient import TestClient

from maso_ai.main import app

client = TestClient(app)


def test_create_and_read_room():
    code = client.post("/rooms").json()["code"]
    assert len(code) == 8 and code[4] == "-"
    info = client.get(f"/rooms/{code}").json()
    assert info == {"code": code, "participants": 0, "lines": 0}


def test_invalid_code_is_rejected():
    assert client.get("/rooms/nope").status_code == 422


def test_unknown_room_is_404():
    assert client.get("/rooms/ZZZZ-000").status_code == 404


def test_typed_reply_reaches_everyone_in_the_room():
    with client.websocket_connect("/rooms/TEAM-904/ws?name=Ama") as a, client.websocket_connect("/rooms/TEAM-904/ws?name=Kofi") as b:
        welcome_a = a.receive_json()
        assert welcome_a["type"] == "welcome"
        assert a.receive_json()["type"] == "history"
        assert a.receive_json() == {"type": "presence", "participants": 1}
        assert a.receive_json() == {"type": "presence", "participants": 2}
        assert b.receive_json()["type"] == "welcome"
        assert b.receive_json()["type"] == "history"
        assert b.receive_json() == {"type": "presence", "participants": 2}

        a.send_json({"type": "reply", "text": "Can you share the slides?"})
        for sock in (a, b):
            event = sock.receive_json()
            assert event["kind"] == "typed" and event["speaker"] == "Ama" and event["text"] == "Can you share the slides?"
            assert event["sid"] == welcome_a["sid"]


def test_late_joiner_gets_recent_history_and_delete_clears_it():
    with client.websocket_connect("/rooms/LATE-111/ws?name=Ama") as a:
        a.receive_json(), a.receive_json(), a.receive_json()
        a.send_json({"type": "reply", "text": "First line"})
        a.receive_json()
        with client.websocket_connect("/rooms/LATE-111/ws?name=Kofi") as b:
            b.receive_json()
            assert [l["text"] for l in b.receive_json()["lines"]] == ["First line"]
    assert client.delete("/rooms/LATE-111").status_code == 204
    assert client.get("/rooms/LATE-111").status_code == 404
