import requests
import yaml
from pathlib import Path

def auth(api_key: str, base_url: str) -> dict:
    """
    Confirms the auth token is valid

    Returns:
        dict: {"success": bool, "message": str, "data": dict}
    """
    auth_url = base_url + "/auth"

    headers = {
        "accept": "application/json",
        "Authorization": "Bearer " + api_key
    }

    try:
        auth_response = requests.get(auth_url, headers=headers)

        if auth_response.status_code == 200:
            return {
                "success": True,
                "message": "Authentication successful",
                "data": auth_response.json()
            }
        else:
            return {
                "success": False,
                "message": f"Authentication failed with status {auth_response.status_code}",
                "data": auth_response.json() if auth_response.text else {}
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Authentication error: {str(e)}",
            "data": {}
        }

def test_auth(config_path=None):
    """Test authentication with config file"""
    if config_path is None:
        config_path = Path(__file__).parent / "config.yaml"

    try:
        with open(config_path, "r") as file:
            config = yaml.safe_load(file)

        api_key = config["api_key"]
        base_url = config["model_server_base_url"]

        return auth(api_key, base_url)

    except Exception as e:
        return {
            "success": False,
            "message": f"Config error: {str(e)}",
            "data": {}
        }

if __name__ == "__main__":
    result = test_auth()
    print(result)