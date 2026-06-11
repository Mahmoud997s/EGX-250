import requests

def test_get_pipeline_execution_status():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/status"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected HTTP 200 but got {response.status_code}"

    json_data = response.json()
    assert "state" in json_data, "Response JSON missing 'state' field"
    assert isinstance(json_data["state"], str), "'state' field should be a string"
    assert json_data["state"].lower() in {"idle", "running", "completed"}, \
        f"State value '{json_data['state']}' not in expected states ['idle', 'running', 'completed']"

test_get_pipeline_execution_status()