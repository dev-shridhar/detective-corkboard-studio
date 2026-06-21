

def test_register_user_success(client):
    """Should successfully register a new user."""
    payload = {
        "username": "sherlock",
        "email": "sherlock@bakerstreet.com",
        "password": "elementary_dear_watson",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "sherlock"
    assert data["email"] == "sherlock@bakerstreet.com"
    assert "id" in data
    assert "hashed_password" not in data  # Never leak password hash


def test_register_duplicate_username(client):
    """Should return 409 conflict when registering a duplicate username."""
    payload1 = {
        "username": "watson",
        "email": "watson1@bakerstreet.com",
        "password": "password123",
    }
    payload2 = {
        "username": "watson",  # Duplicate username
        "email": "watson2@bakerstreet.com",
        "password": "password123",
    }
    res1 = client.post("/api/v1/auth/register", json=payload1)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == 409
    assert "Username already taken" in res2.json()["detail"]


def test_register_duplicate_email(client):
    """Should return 409 conflict when registering a duplicate email address."""
    payload1 = {
        "username": "lestrade1",
        "email": "lestrade@scotlandyard.com",
        "password": "password123",
    }
    payload2 = {
        "username": "lestrade2",
        "email": "lestrade@scotlandyard.com",  # Duplicate email
        "password": "password123",
    }
    res1 = client.post("/api/v1/auth/register", json=payload1)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == 409
    assert "Email already registered" in res2.json()["detail"]


def test_login_success(client):
    """Should successfully authenticate and set HttpOnly refresh token cookie."""
    # Register first
    register_payload = {
        "username": "moriarty",
        "email": "moriarty@london.com",
        "password": "final_problem",
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Login
    login_payload = {
        "username": "moriarty",
        "password": "final_problem",
    }
    response = client.post("/api/v1/auth/login", data=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" not in data  # Stored in cookie instead

    # Verify HttpOnly cookie
    assert "refresh_token" in client.cookies
    refresh_cookie = None
    for cookie in client.cookies.jar:
        if cookie.name == "refresh_token":
            refresh_cookie = cookie
            break

    assert refresh_cookie is not None
    assert refresh_cookie.secure is False  # Dev env is not secure
    # HttpOnly is represented as non-standard or a property depending on the jar implementation
    assert refresh_cookie.has_nonstandard_attr("HttpOnly") or "httponly" in getattr(refresh_cookie, "_rest", {})
    assert refresh_cookie.value is not None



def test_login_invalid_password(client):
    """Should return 401 Unauthorized for incorrect password."""
    register_payload = {
        "username": "mycroft",
        "email": "mycroft@diogenes.com",
        "password": "british_government",
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "username": "mycroft",
        "password": "wrong_password",
    }
    response = client.post("/api/v1/auth/login", data=login_payload)
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_get_me_success(client):
    """Should return current user profile when given valid access token."""
    register_payload = {
        "username": "hudson",
        "email": "hudson@bakerstreet.com",
        "password": "landlady_secrets",
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Login to get token
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "hudson", "password": "landlady_secrets"},
    )
    token = login_res.json()["access_token"]

    # Call /me with token
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "hudson"
    assert data["email"] == "hudson@bakerstreet.com"


def test_get_me_invalid_token(client):
    """Should return 401 when calling /me with invalid token."""
    headers = {"Authorization": "Bearer invalid_token_here"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401


def test_refresh_token_rotation_success(client):
    """Should rotate refresh token and issue a new access token successfully."""
    # Register & Login
    register_payload = {
        "username": "adler",
        "email": "irene@adler.com",
        "password": "the_woman_secrets",
    }
    client.post("/api/v1/auth/register", json=register_payload)
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "adler", "password": "the_woman_secrets"},
    )
    first_access_token = login_res.json()["access_token"]
    first_refresh_token = client.cookies["refresh_token"]

    # Call refresh endpoint (TestClient automatically includes cookies)
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    data = refresh_res.json()
    assert "access_token" in data
    assert data["access_token"] != first_access_token

    # Verify refresh token cookie was rotated (new value)
    assert "refresh_token" in client.cookies
    second_refresh_token = client.cookies["refresh_token"]
    assert second_refresh_token != first_refresh_token


def test_refresh_token_reuse_fails(client, session):
    """Should reject reuse of an old rotated refresh token."""
    # Register & Login
    register_payload = {
        "username": "hopkins",
        "email": "hopkins@yard.com",
        "password": "young_detective",
    }
    client.post("/api/v1/auth/register", json=register_payload)
    client.post(
        "/api/v1/auth/login",
        data={"username": "hopkins", "password": "young_detective"},
    )
    first_refresh = client.cookies["refresh_token"]

    # First refresh: succeeds
    client.post("/api/v1/auth/refresh")

    # Second refresh using the FIRST refresh token: should fail (reuse prevention)
    # Clear the cookie jar first to prevent any duplicate cookie conflicts
    client.cookies.clear()
    client.cookies.set("refresh_token", first_refresh, path="/api/v1/auth")
    reuse_res = client.post("/api/v1/auth/refresh")
    assert reuse_res.status_code == 401
    assert "Invalid or expired refresh token" in reuse_res.json()["detail"]


def test_logout_success(client):
    """Should invalidate database refresh token hash and clear client cookie."""
    register_payload = {
        "username": "gregson",
        "email": "gregson@yard.com",
        "password": "rival_detective",
    }
    client.post("/api/v1/auth/register", json=register_payload)
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "gregson", "password": "rival_detective"},
    )
    access_token = login_res.json()["access_token"]

    # Logout
    headers = {"Authorization": f"Bearer {access_token}"}
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "success"

    # Verify cookie is cleared
    # Note: TestClient delete_cookie leaves cookie with empty value or deleted
    assert "refresh_token" not in client.cookies or client.cookies["refresh_token"] == ""

    # Trying to refresh after logout should fail
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 401


def test_login_case_insensitive_and_email(client):
    """Should successfully authenticate regardless of case, and support email login."""
    # Register with mixed case
    register_payload = {
        "username": "Sherlock_Holmes",
        "email": "Sherlock.Holmes@BakerStreet.com",
        "password": "elementary_dear_watson",
    }
    res = client.post("/api/v1/auth/register", json=register_payload)
    assert res.status_code == 201

    # Login with lowercase username
    login_payload_username_lower = {
        "username": "sherlock_holmes",
        "password": "elementary_dear_watson",
    }
    login_res1 = client.post("/api/v1/auth/login", data=login_payload_username_lower)
    assert login_res1.status_code == 200

    # Login with email
    login_payload_email = {
        "username": "sherlock.holmes@bakerstreet.com",
        "password": "elementary_dear_watson",
    }
    login_res2 = client.post("/api/v1/auth/login", data=login_payload_email)
    assert login_res2.status_code == 200


def test_register_invalid_username_pattern(client):
    """Should return 422 Unprocessable Entity when username has invalid chars or is too short."""
    # Too short
    payload_too_short = {
        "username": "sh",
        "email": "sh@bakerstreet.com",
        "password": "password123",
    }
    res1 = client.post("/api/v1/auth/register", json=payload_too_short)
    assert res1.status_code == 422

    # Invalid characters (space)
    payload_space = {
        "username": "sherlock holmes",
        "email": "sh2@bakerstreet.com",
        "password": "password123",
    }
    res2 = client.post("/api/v1/auth/register", json=payload_space)
    assert res2.status_code == 422
