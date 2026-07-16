import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_registration_and_login(client: AsyncClient):
    """
    Test user registration, login, profile retrieval, and token refresh.
    """
    # 1. Register a new user
    reg_payload = {
        "name": "Test User",
        "email": "test_user@cafechai.lk",
        "password": "secretpassword",
        "role": "ADMIN",
        "status": "ACTIVE"
    }
    
    response = await client.post("/auth/register", json=reg_payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["email"] == reg_payload["email"]
    assert "password" not in res_data["data"]

    # 2. Login with credentials
    login_payload = {
        "email": "test_user@cafechai.lk",
        "password": "secretpassword"
    }
    
    response = await client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    login_res = response.json()
    assert login_res["success"] is True
    assert "token" in login_res["data"]
    assert "refresh_token" in login_res["data"]
    
    access_token = login_res["data"]["token"]
    refresh_token = login_res["data"]["refresh_token"]

    # 3. Retrieve logged-in user profile
    headers = {"Authorization": f"Bearer {access_token}"}
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    me_res = response.json()
    assert me_res["success"] is True
    assert me_res["data"]["email"] == reg_payload["email"]

    # 4. Refresh token
    refresh_payload = {
        "refresh_token": refresh_token
    }
    response = await client.post("/auth/refresh", json=refresh_payload)
    assert response.status_code == 200
    refresh_res = response.json()
    assert refresh_res["success"] is True
    assert "token" in refresh_res["data"]
