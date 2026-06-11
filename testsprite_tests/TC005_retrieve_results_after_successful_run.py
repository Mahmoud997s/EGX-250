import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_retrieve_results_after_successful_run():
    run_url = f"{BASE_URL}/api/run"
    results_url = f"{BASE_URL}/api/results"

    try:
        # Step 1: Run the pipeline successfully
        run_response = requests.post(run_url, timeout=TIMEOUT)
        assert run_response.status_code == 200, f"Expected 200 but got {run_response.status_code}"
        run_json = run_response.json()
        assert run_json.get("success") is True, f"Expected success true but got {run_json.get('success')}"
        assert "stdout" in run_json and isinstance(run_json["stdout"], str), "stdout missing or not a string"

        # Step 2: Retrieve results after successful run
        results_response = requests.get(results_url, timeout=TIMEOUT)
        assert results_response.status_code == 200, f"Expected 200 but got {results_response.status_code}"
        results_json = results_response.json()
        assert results_json.get("success") is True, f"Expected success true but got {results_json.get('success')}"
        assert "data" in results_json, "data key missing in results"
        assert isinstance(results_json["data"], list), "data is not an array/list"

    except requests.RequestException as e:
        assert False, f"Request failed: {str(e)}"

test_retrieve_results_after_successful_run()