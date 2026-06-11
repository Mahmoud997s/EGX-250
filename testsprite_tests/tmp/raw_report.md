
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** egx-scraper-poc
- **Date:** 2026-06-12
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get pipeline execution status
- **Test Code:** [TC001_get_pipeline_execution_status.py](./TC001_get_pipeline_execution_status.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 20, in <module>
  File "<string>", line 15, in test_get_pipeline_execution_status
AssertionError: Response JSON missing 'state' field

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a6d8944e-5f0d-460e-a6ad-555969a6b286/a2dcbb41-9d3f-4282-a688-301a61116781
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 run pipeline successfully
- **Test Code:** [TC002_run_pipeline_successfully.py](./TC002_run_pipeline_successfully.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/urllib3/connectionpool.py", line 534, in _make_request
    response = conn.getresponse()
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/urllib3/connection.py", line 571, in getresponse
    httplib_response = super().getresponse()
                       ^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/http/client.py", line 1430, in getresponse
    response.begin()
  File "/var/lang/lib/python3.12/http/client.py", line 331, in begin
    version, status, reason = self._read_status()
                              ^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/http/client.py", line 292, in _read_status
    line = str(self.fp.readline(_MAXLINE + 1), "iso-8859-1")
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/socket.py", line 720, in readinto
    return self._sock.recv_into(b)
           ^^^^^^^^^^^^^^^^^^^^^^^
TimeoutError: timed out

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/adapters.py", line 667, in send
    resp = conn.urlopen(
           ^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/urllib3/connectionpool.py", line 841, in urlopen
    retries = retries.increment(
              ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/urllib3/util/retry.py", line 490, in increment
    raise reraise(type(error), error, _stacktrace)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/urllib3/util/util.py", line 39, in reraise
    raise value
  File "/var/lang/lib/python3.12/site-packages/urllib3/connectionpool.py", line 787, in urlopen
    response = self._make_request(
               ^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/urllib3/connectionpool.py", line 536, in _make_request
    self._raise_timeout(err=e, url=url, timeout_value=read_timeout)
  File "/var/lang/lib/python3.12/site-packages/urllib3/connectionpool.py", line 367, in _raise_timeout
    raise ReadTimeoutError(
urllib3.exceptions.ReadTimeoutError: HTTPConnectionPool(host='proxy.tun.testsprite.com', port=9090): Read timed out. (read timeout=30)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "<string>", line 12, in test_run_pipeline_successfully
  File "/var/lang/lib/python3.12/site-packages/requests/api.py", line 115, in post
    return request("post", url, data=data, json=json, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/requests/api.py", line 59, in request
    return session.request(method=method, url=url, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/requests/sessions.py", line 589, in request
    resp = self.send(prep, **send_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/requests/sessions.py", line 703, in send
    r = adapter.send(request, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/requests/adapters.py", line 713, in send
    raise ReadTimeout(e, request=request)
requests.exceptions.ReadTimeout: HTTPConnectionPool(host='proxy.tun.testsprite.com', port=9090): Read timed out. (read timeout=30)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 29, in <module>
  File "<string>", line 14, in test_run_pipeline_successfully
AssertionError: Request failed: HTTPConnectionPool(host='proxy.tun.testsprite.com', port=9090): Read timed out. (read timeout=30)

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a6d8944e-5f0d-460e-a6ad-555969a6b286/294b644c-06ac-4313-bf0d-ebcfbf6902af
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 handle pipeline run failure
- **Test Code:** [TC003_handle_pipeline_run_failure.py](./TC003_handle_pipeline_run_failure.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a6d8944e-5f0d-460e-a6ad-555969a6b286/80548f28-9007-4e81-a98f-3832251162d8
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 prevent concurrent pipeline runs
- **Test Code:** [TC004_prevent_concurrent_pipeline_runs.py](./TC004_prevent_concurrent_pipeline_runs.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a6d8944e-5f0d-460e-a6ad-555969a6b286/127f7df1-e448-4320-9ca4-2c2e65a6869e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 retrieve results after successful run
- **Test Code:** [TC005_retrieve_results_after_successful_run.py](./TC005_retrieve_results_after_successful_run.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 29, in <module>
  File "<string>", line 13, in test_retrieve_results_after_successful_run
AssertionError: Expected 200 but got 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a6d8944e-5f0d-460e-a6ad-555969a6b286/42a382c7-6733-4cc2-94b0-950a0c21348e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 handle results retrieval before run
- **Test Code:** [TC006_handle_results_retrieval_before_run.py](./TC006_handle_results_retrieval_before_run.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 19, in <module>
  File "<string>", line 10, in test_handle_results_retrieval_before_run
AssertionError: Expected 404 status, got 200

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a6d8944e-5f0d-460e-a6ad-555969a6b286/06356ca9-f375-4fe3-823d-ab03be8ea93c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **33.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---