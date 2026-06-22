import uuid
from sqlmodel import select
from app.models.user import User
from app.models.board import Board
from app.models.node import Node
from app.models.edge import Edge

def _activate_user(session, username: str) -> None:
    statement = select(User).where(User.username == username.lower())
    user = session.exec(statement).one()
    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)

def test_create_edge_with_custom_id(client, session):
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

    # 4. Create source and target nodes
    node1_res = client.post(
        f"/api/v1/boards/{board_id}/nodes",
        json={"title": "Node 1", "x": 0.0, "y": 0.0},
        headers=headers
    )
    node2_res = client.post(
        f"/api/v1/boards/{board_id}/nodes",
        json={"title": "Node 2", "x": 10.0, "y": 10.0},
        headers=headers
    )
    node1_id = node1_res.json()["id"]
    node2_id = node2_res.json()["id"]

    # 5. Create edge with custom, client-provided UUID
    custom_edge_id = str(uuid.uuid4())
    edge_payload = {
        "id": custom_edge_id,
        "source_node_id": node1_id,
        "target_node_id": node2_id,
        "color": "#c0392b",
        "label": "connected clues"
    }
    edge_res = client.post(f"/api/v1/boards/{board_id}/edges", json=edge_payload, headers=headers)
    assert edge_res.status_code == 201
    edge_data = edge_res.json()
    assert edge_data["id"] == custom_edge_id
    assert edge_data["label"] == "connected clues"
