import io
import json
import unittest
import urllib.error

from bugagent import BugAgentClient


KEY = "ba_live_" + ("a" * 64)


class Response:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode()


class BugAgentClientTest(unittest.TestCase):
    def test_lists_project_bound_reports_without_key_in_url(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return Response({"reports": [], "total": 0})

        client = BugAgentClient(api_key=KEY, opener=opener)
        self.assertEqual(client.list_reports("project-1", limit=25, offset=50), {"reports": [], "total": 0})
        request, timeout = calls[0]
        self.assertIn("project_id=project-1", request.full_url)
        self.assertIn("offset=50", request.full_url)
        self.assertNotIn(KEY, request.full_url)
        self.assertEqual(request.headers["Authorization"], f"Bearer {KEY}")
        self.assertEqual(timeout, 20)

    def test_retries_read_but_not_write(self):
        attempts = []
        delays = []

        def opener(request, timeout):
            del timeout
            attempts.append(request.method)
            if len(attempts) < 3:
                raise urllib.error.HTTPError(request.full_url, 503, "retry", {}, io.BytesIO(b'{"error":"retry"}'))
            return Response([])

        client = BugAgentClient(api_key=KEY, opener=opener, sleep=delays.append)
        self.assertEqual(client.list_projects(), [])
        self.assertEqual(attempts, ["GET", "GET", "GET"])
        self.assertEqual(delays, [0.5, 1.0])

    def test_create_report_is_project_scoped(self):
        calls = []

        def opener(request, timeout):
            del timeout
            calls.append(request)
            return Response({"id": "report-1", "short_id": "TEST-API-001"})

        client = BugAgentClient(api_key=KEY, opener=opener)
        client.create_report("Checkout failed", "Expected 200; received 500.", "project-1", "s2")
        body = json.loads(calls[0].data)
        self.assertEqual(calls[0].method, "POST")
        self.assertEqual(body["project_id"], "project-1")
        self.assertNotIn(KEY, json.dumps(body))


if __name__ == "__main__":
    unittest.main()
