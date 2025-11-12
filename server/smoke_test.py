"""Simple smoke test for the upload and query endpoints.

This script expects the server to be running on http://localhost:8000 and an
OPENAI_API_KEY set. It does not include PDF files; use your own PDFs to test.
"""
import requests
import json


def test_query():
    url = "http://localhost:8000/query"
    payload = {"question": "What is the main topic of the documents?"}
    r = requests.post(url, json=payload)
    print("status", r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)


if __name__ == "__main__":
    test_query()
