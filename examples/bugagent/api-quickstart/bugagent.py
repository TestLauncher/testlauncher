#!/usr/bin/env python3
"""Small standard-library bugAgent REST client for onboarding and CI examples."""

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

RETRYABLE_STATUS = {429, 502, 503, 504}


class BugAgentClient:
    def __init__(self, api_key=None, base_url=None, opener=None, sleep=time.sleep):
        self.api_key = api_key or os.environ.get("BUGAGENT_API_KEY", "")
        if not self.api_key.startswith("ba_live_"):
            raise ValueError("Set BUGAGENT_API_KEY to a workspace-scoped ba_live_ key")
        self.base_url = (base_url or os.environ.get("BUGAGENT_BASE_URL") or "https://app.bugagent.com").rstrip("/")
        self.opener = opener or urllib.request.urlopen
        self.sleep = sleep

    def _request(self, path, method="GET", body=None, max_read_retries=3):
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                **({"Content-Type": "application/json"} if data else {}),
            },
        )
        for attempt in range(max_read_retries + 1):
            try:
                with self.opener(request, timeout=20) as response:
                    return json.loads(response.read().decode() or "null")
            except urllib.error.HTTPError as error:
                if method == "GET" and error.code in RETRYABLE_STATUS and attempt < max_read_retries:
                    retry_after = error.headers.get("Retry-After")
                    delay = float(retry_after) if retry_after and retry_after.isdigit() else min(30, 0.5 * (2 ** attempt))
                    error.close()
                    self.sleep(delay)
                    continue
                try:
                    payload = json.loads(error.read().decode())
                    message = payload.get("error", error.reason)
                except (ValueError, AttributeError):
                    message = error.reason
                raise RuntimeError(f"bugAgent API {error.code}: {message}") from None

    def list_projects(self):
        return self._request("/api/projects")

    def list_reports(self, project_id, limit=10, offset=0, status=None):
        if not 1 <= limit <= 100:
            raise ValueError("limit must be from 1 to 100")
        query = {"project_id": project_id, "limit": limit, "offset": offset}
        if status:
            query["status"] = status
        return self._request(f"/api/reports?{urllib.parse.urlencode(query)}")

    def create_report(self, title, description, project_id, severity="s3"):
        if len(title.strip()) < 3:
            raise ValueError("title must contain at least 3 characters")
        return self._request("/api/reports", method="POST", body={
            "title": title.strip(),
            "description": description.strip(),
            "project_id": project_id,
            "severity": severity,
            "metadata": {"source": "public-python-quickstart"},
        })


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("projects")
    bugs = subparsers.add_parser("bugs")
    bugs.add_argument("--project-id", required=True)
    bugs.add_argument("--limit", type=int, default=10)
    bugs.add_argument("--offset", type=int, default=0)
    bugs.add_argument("--status")
    args = parser.parse_args()
    client = BugAgentClient()
    result = client.list_projects() if args.command == "projects" else client.list_reports(
        args.project_id, args.limit, args.offset, args.status
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
