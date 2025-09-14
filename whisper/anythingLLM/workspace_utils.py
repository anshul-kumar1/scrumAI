import requests
import yaml
from pathlib import Path

def workspaces(api_key: str, base_url: str) -> dict:
    """
    Get available workspaces info

    Returns:
        dict: {"success": bool, "message": str, "data": list}
    """
    workspaces_url = base_url + "/workspaces"

    headers = {
        "accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": "Bearer " + api_key
    }

    try:
        workspaces_response = requests.get(workspaces_url, headers=headers)

        if workspaces_response.status_code == 200:
            return {
                "success": True,
                "message": "Workspaces retrieved successfully",
                "data": workspaces_response.json()
            }
        else:
            return {
                "success": False,
                "message": f"Failed to get workspaces with status {workspaces_response.status_code}",
                "data": workspaces_response.json() if workspaces_response.text else {}
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Workspaces error: {str(e)}",
            "data": {}
        }

def get_workspaces(config_path=None):
    """Get workspaces with config file"""
    if config_path is None:
        config_path = Path(__file__).parent / "config.yaml"

    try:
        with open(config_path, "r") as file:
            config = yaml.safe_load(file)

        api_key = config["api_key"]
        base_url = config["model_server_base_url"]

        return workspaces(api_key, base_url)

    except Exception as e:
        return {
            "success": False,
            "message": f"Config error: {str(e)}",
            "data": {}
        }

if __name__ == "__main__":
    result = get_workspaces()
    print(result)