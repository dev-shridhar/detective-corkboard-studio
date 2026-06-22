import uuid
from sqlmodel import select
from app.models.user import User
from app.models.board import Board
from app.models.node import Node

def _activate_user(session, username: str) -> None:
    statement = select(User).where(User.username == username.lower())
    user = session.exec(statement).one()
    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)

def test_create_node_with_custom_id(client, session):
    # 1. Register and activate user
    register_payload = {
        "username": "sherlock",
        "email": "sherlock@bakerstreet.com",
        "password": "elementary_dear_watson",
    }
    client.post("/api/v1/auth/register", json=register_payload)
    _activate_user(session, "sherlock")

    # 2. Login
    login_payload = {
        "username": "sherlock",
        "password": "elementary_dear_watson",
    }
    login_res = client.post("/api/v1/auth/login", data=login_payload)
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Create a board
    board_payload = {
        "name": "Hound of the Baskervilles",
        "description": "Tracing the legend"
    }
    board_res = client.post("/api/v1/boards", json=board_payload, headers=headers)
    board_id = board_res.json()["id"]

    # 4. Create a node with a custom, client-provided UUID
    custom_node_id = str(uuid.uuid4())
    node_payload = {
        "id": custom_node_id,
        "title": "Grimpen Mire",
        "description": "Dangerous bog area",
        "shape": "note_card",
        "color": "#f5e6c8",
        "x": 100.0,
        "y": 200.0,
        "concepts": ["location", "danger"],
        "links": []
    }
    node_res = client.post(f"/api/v1/boards/{board_id}/nodes", json=node_payload, headers=headers)
    assert node_res.status_code == 201
    node_data = node_res.json()
    assert node_data["id"] == custom_node_id
    assert node_data["title"] == "Grimpen Mire"

    # 5. Create a node without custom UUID (should generate automatically)
    node_payload_no_id = {
        "title": "Baskerville Hall",
        "description": "Family estate",
        "shape": "polaroid",
        "color": "#ffffff",
        "x": 300.0,
        "y": 400.0,
        "concepts": ["location"],
        "links": []
    }
    node_res_no_id = client.post(f"/api/v1/boards/{board_id}/nodes", json=node_payload_no_id, headers=headers)
    assert node_res_no_id.status_code == 201
    node_data_no_id = node_res_no_id.json()
    assert "id" in node_data_no_id
    assert node_data_no_id["id"] != custom_node_id
