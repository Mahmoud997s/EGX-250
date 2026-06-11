import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_handle_results_retrieval_before_run():
    url = f"{BASE_URL}/api/results"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404 status, got {response.status_code}"
        json_resp = response.json()
        assert "error" in json_resp, "Response JSON must contain 'error' key"
        error_message = json_resp["error"].lower()
        assert "unavailable" in error_message or "no results" in error_message, \
            "Error message should indicate results are unavailable"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_handle_results_retrieval_before_run()