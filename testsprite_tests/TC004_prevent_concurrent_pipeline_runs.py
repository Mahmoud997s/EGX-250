import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_prevent_concurrent_pipeline_runs():
    # Start first pipeline run to create active lock file
    first_run_response = requests.post(f"{BASE_URL}/api/run", timeout=TIMEOUT)
    try:
        # It may succeed or fail depending on system state, but if it succeeds,
        # the pipeline is running or done, so we have a lock to test against.
        # Wait shortly to ensure the lock is held if pipeline is still running
        if first_run_response.status_code == 200 and first_run_response.json().get("success") == True:
            # Immediately post again to trigger concurrent lock error
            concurrent_response = requests.post(f"{BASE_URL}/api/run", timeout=TIMEOUT)
            assert concurrent_response.status_code == 500, \
                f"Expected 500 status for concurrent run attempt but got {concurrent_response.status_code}"
            payload = concurrent_response.json()
            assert payload.get("success") is False, "Expected success false in concurrent run failure response"
            error_msg = payload.get("error", "").lower()
            assert "concurrent" in error_msg or "execution is blocked" in error_msg, \
                f"Error message does not indicate concurrent execution is blocked: {error_msg}"
        elif first_run_response.status_code == 500:
            # If first run failed with 500, it may be due to concurrent lock or other error.
            # We verify the error indicates concurrent execution is blocked.
            payload = first_run_response.json()
            assert payload.get("success") is False, "Expected success false in failure response"
            error_msg = payload.get("error", "").lower()
            assert "concurrent" in error_msg or "execution is blocked" in error_msg, \
                f"Error message does not indicate concurrent execution is blocked: {error_msg}"
        else:
            # If first run has some other unexpected status, fail the test
            raise AssertionError(f"Unexpected status code from initial run: {first_run_response.status_code}")
    finally:
        # Wait for pipeline to finish before exiting test to avoid leaving active locks
        # Poll status endpoint for idle state with timeout up to 60 seconds
        for _ in range(12):
            status_response = requests.get(f"{BASE_URL}/api/status", timeout=TIMEOUT)
            if status_response.status_code == 200 and status_response.json().get("state") == "idle":
                break
            time.sleep(5)