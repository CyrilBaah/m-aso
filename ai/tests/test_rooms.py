from fastapi.testclient import TestClient

from maso_ai.main import app


def names(event: dict) -> list[str]:
    assert event["type"] == "presence"
    return event["names"]

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
        assert names(a.receive_json()) == ["Ama"]
        assert names(a.receive_json()) == ["Ama", "Kofi"]
        assert b.receive_json()["type"] == "welcome"
        assert b.receive_json()["type"] == "history"
        assert names(b.receive_json()) == ["Ama", "Kofi"]

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


def test_rename_updates_presence_and_later_lines():
    with client.websocket_connect("/rooms/NAME-222/ws") as a:
        for _ in range(3):
            a.receive_json()
        a.send_json({"type": "rename", "name": "Efua"})
        assert names(a.receive_json()) == ["Efua"]
        a.send_json({"type": "reply", "text": "Hello"})
        assert a.receive_json()["speaker"] == "Efua"


def test_captions_wait_until_everyone_has_agreed():
    with client.websocket_connect("/rooms/CONS-333/ws?name=Ama&cid=ama") as a:
        for _ in range(3):
            a.receive_json()
        with client.websocket_connect("/rooms/CONS-333/ws?name=Kofi&cid=kofi") as b:
            a.receive_json()  # presence: Kofi arrived
            for _ in range(3):
                b.receive_json()

            a.send_json({"type": "consent"})
            people = {p["name"]: p["agreed"] for p in a.receive_json()["people"]}
            assert people == {"Ama": True, "Kofi": False}

            a.send_json({"type": "audio_start"})
            error = a.receive_json()
            assert error["code"] == "consent_pending" and "Kofi" in error["message"]

            b.send_json({"type": "consent"})
            assert all(p["agreed"] for p in a.receive_json()["people"])


def test_consent_follows_the_browser_across_screens():
    with client.websocket_connect("/rooms/CONS-444/ws?name=Ama&cid=ama") as consent_screen:
        for _ in range(3):
            consent_screen.receive_json()
        consent_screen.send_json({"type": "consent"})
        consent_screen.receive_json()
    with client.websocket_connect("/rooms/CONS-444/ws?name=Ama&cid=ama") as room_screen:
        sid = room_screen.receive_json()["sid"]
        room_screen.receive_json()
        assert room_screen.receive_json()["people"] == [{"name": "Ama", "sid": sid, "agreed": True}]
