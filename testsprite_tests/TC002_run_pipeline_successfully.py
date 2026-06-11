import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_run_pipeline_successfully():
    url = f"{BASE_URL}/api/run"
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        json_resp = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "success" in json_resp, "Response JSON missing 'success' field"
    assert json_resp["success"] is True, f"Expected success true but got {json_resp['success']}"
    assert "stdout" in json_resp, "Response JSON missing 'stdout' field"
    assert isinstance(json_resp["stdout"], str), "'stdout' should be a string"
    assert len(json_resp["stdout"].strip()) > 0, "'stdout' should not be empty"

test_run_pipeline_successfully()