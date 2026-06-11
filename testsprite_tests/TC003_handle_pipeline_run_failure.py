import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_handle_pipeline_run_failure():
    url = f"{BASE_URL}/api/run"
    try:
        response = requests.post(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Expecting status 500 for pipeline failure or non-zero engine exit
    assert response.status_code == 500, f"Expected status 500 but got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate success is false
    assert "success" in json_data, "'success' not in response"
    assert json_data["success"] is False, "Expected success to be false"

    # Validate error message presence and non-empty string
    assert "error" in json_data, "'error' not in response"
    assert isinstance(json_data["error"], str) and len(json_data["error"].strip()) > 0, "error message is empty or not a string"

test_handle_pipeline_run_failure()