#!/usr/bin/env python3
"""
Firebase 보안 규칙 배포 (콘솔에 붙여넣지 않고 CLI 로 배포)

  python3 scripts/deploy-rules.py                 # firestore + storage 둘 다
  python3 scripts/deploy-rules.py firestore       # 하나만

인증: 서비스 계정 키
  export FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)"     # 또는 base64
  또는
  export GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json
"""
import base64
import json
import os
import sys
import urllib.request

from google.oauth2 import service_account
import google.auth.transport.requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCOPES = ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"]

TARGETS = {
    "firestore": {
        "file": "firebase/firestore.rules",
        "name": "firestore.rules",
        "release": "cloud.firestore",
    },
    "storage": {
        "file": "firebase/storage.rules",
        "name": "storage.rules",
        "release": None,  # firebase.storage/<bucket> — 아래에서 채움
    },
}


def load_credentials():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if raw:
        text = raw if raw.strip().startswith("{") else base64.b64decode(raw).decode()
        info = json.loads(text)
        if isinstance(info.get("private_key"), str):
            info["private_key"] = info["private_key"].replace("\\n", "\n")
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES), info["project_id"]

    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if path and os.path.exists(path):
        info = json.load(open(path))
        return service_account.Credentials.from_service_account_file(path, scopes=SCOPES), info["project_id"]

    sys.exit("서비스 계정 키가 없습니다. FIREBASE_SERVICE_ACCOUNT 또는 GOOGLE_APPLICATION_CREDENTIALS 를 설정하세요.")


def api(token: str, method: str, url: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        sys.exit(f"[{method} {url}] {e.code}\n{e.read().decode()[:600]}")


def deploy(token: str, project: str, key: str, bucket: str):
    t = TARGETS[key]
    src = open(os.path.join(ROOT, t["file"]), encoding="utf-8").read()

    ruleset = api(
        token,
        "POST",
        f"https://firebaserules.googleapis.com/v1/projects/{project}/rulesets",
        {"source": {"files": [{"name": t["name"], "content": src}]}},
    )
    rid = ruleset["name"].split("/")[-1]

    release = t["release"] or f"firebase.storage/{bucket}"
    rel_id = urllib.request.quote(release, safe="")
    api(
        token,
        "PATCH",
        f"https://firebaserules.googleapis.com/v1/projects/{project}/releases/{rel_id}",
        {"release": {"name": f"projects/{project}/releases/{release}", "rulesetName": ruleset["name"]}},
    )
    print(f"  [OK] {key:9s} → {t['file']} (ruleset {rid}, release {release})")


def main():
    creds, project = load_credentials()
    creds.refresh(google.auth.transport.requests.Request())
    token = creds.token

    bucket = os.environ.get("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") or f"{project}.firebasestorage.app"
    keys = sys.argv[1:] or list(TARGETS)

    print(f"프로젝트: {project} / 버킷: {bucket}")
    for k in keys:
        if k not in TARGETS:
            sys.exit(f"알 수 없는 대상: {k} (가능: {', '.join(TARGETS)})")
        deploy(token, project, k, bucket)
    print("배포 완료")


if __name__ == "__main__":
    main()
