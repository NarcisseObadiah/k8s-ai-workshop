#!/usr/bin/env python3

import csv
import json
import os
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ID = os.getenv("PROJECT_ID", "kubernetes-cloud-workshop")
CSV_PATH = Path(sys.argv[1] if len(sys.argv) > 1 else "teams_lead.csv")

EXPECTED_FIELDS = [
    "team",
    "team_lead",
    "google_email",
    "member_2",
    "member_3",
]

TEAM_PATTERN = re.compile(r"^team-\d{2}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def run(command: list[str], *, input_text: str | None = None) -> None:
    print("+", " ".join(command))
    subprocess.run(
        command,
        input=input_text,
        text=True,
        check=True,
    )


def capture(command: list[str]) -> str:
    result = subprocess.run(
        command,
        text=True,
        check=True,
        capture_output=True,
    )
    return result.stdout.strip()


def apply_object(resource: dict) -> None:
    run(
        ["kubectl", "apply", "-f", "-"],
        input_text=json.dumps(resource),
    )


if not CSV_PATH.exists():
    raise SystemExit(f"CSV file not found: {CSV_PATH}")

active_project = capture(
    ["gcloud", "config", "get-value", "project"]
)

if active_project != PROJECT_ID:
    raise SystemExit(
        f"Wrong active project: {active_project}. "
        f"Expected: {PROJECT_ID}"
    )

project_number = capture(
    [
        "gcloud",
        "projects",
        "describe",
        PROJECT_ID,
        "--format=value(projectNumber)",
    ]
)

run(
    [
        "kubectl",
        "get",
        "clusterrole",
        "cloudassist-participant",
    ]
)

with CSV_PATH.open(
    "r",
    encoding="utf-8-sig",
    newline="",
) as csv_file:
    reader = csv.DictReader(csv_file)

    if reader.fieldnames != EXPECTED_FIELDS:
        raise SystemExit(
            "Incorrect CSV header.\n"
            f"Expected: {','.join(EXPECTED_FIELDS)}\n"
            f"Found:    {','.join(reader.fieldnames or [])}"
        )

    rows = list(reader)

if not rows:
    raise SystemExit("The CSV contains no team rows.")

seen_teams: set[str] = set()
seen_emails: set[str] = set()

for row_number, row in enumerate(rows, start=2):
    team = (row["team"] or "").strip()
    team_lead = (row["team_lead"] or "").strip()
    google_email = (row["google_email"] or "").strip().lower()

    if not TEAM_PATTERN.fullmatch(team):
        raise SystemExit(
            f"Row {row_number}: invalid team '{team}'. "
            "Expected format: team-01"
        )

    if not team_lead:
        raise SystemExit(
            f"Row {row_number}: team lead is missing."
        )

    if not EMAIL_PATTERN.fullmatch(google_email):
        raise SystemExit(
            f"Row {row_number}: invalid Google Account email "
            f"'{google_email}'."
        )

    if team in seen_teams:
        raise SystemExit(
            f"Row {row_number}: duplicate team '{team}'."
        )

    if google_email in seen_emails:
        raise SystemExit(
            f"Row {row_number}: duplicate email "
            f"'{google_email}'."
        )

    seen_teams.add(team)
    seen_emails.add(google_email)

    print()
    print("=" * 60)
    print(f"Provisioning {team}")
    print(f"Lead:  {team_lead}")
    print(f"Email: {google_email}")
    print("=" * 60)

    namespace = {
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": {
            "name": team,
            "labels": {
                "workshop": "cloudassist",
                "team": team,
            },
        },
    }

    quota = {
        "apiVersion": "v1",
        "kind": "ResourceQuota",
        "metadata": {
            "name": "team-quota",
            "namespace": team,
        },
        "spec": {
            "hard": {
                "requests.cpu": "2",
                "requests.memory": "4Gi",
                "limits.cpu": "4",
                "limits.memory": "8Gi",
                "pods": "10",
                "services": "5",
                "configmaps": "10",
                "count/deployments.apps": "5",
                "count/horizontalpodautoscalers.autoscaling": "2",
                "services.loadbalancers": "0",
                "services.nodeports": "0",
            }
        },
    }

    limit_range = {
        "apiVersion": "v1",
        "kind": "LimitRange",
        "metadata": {
            "name": "team-defaults",
            "namespace": team,
        },
        "spec": {
            "limits": [
                {
                    "type": "Container",
                    "defaultRequest": {
                        "cpu": "100m",
                        "memory": "128Mi",
                    },
                    "default": {
                        "cpu": "500m",
                        "memory": "1Gi",
                    },
                }
            ]
        },
    }

    service_account = {
        "apiVersion": "v1",
        "kind": "ServiceAccount",
        "metadata": {
            "name": "cloudassist-backend",
            "namespace": team,
        },
    }

    role_binding = {
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "RoleBinding",
        "metadata": {
            "name": "team-participants",
            "namespace": team,
        },
        "subjects": [
            {
                "kind": "User",
                "name": google_email,
                "apiGroup": "rbac.authorization.k8s.io",
            }
        ],
        "roleRef": {
            "kind": "ClusterRole",
            "name": "cloudassist-participant",
            "apiGroup": "rbac.authorization.k8s.io",
        },
    }

    apply_object(namespace)
    apply_object(quota)
    apply_object(limit_range)
    apply_object(service_account)
    apply_object(role_binding)

    principal = (
        "principal://iam.googleapis.com/projects/"
        f"{project_number}/locations/global/"
        f"workloadIdentityPools/{PROJECT_ID}.svc.id.goog/"
        f"subject/ns/{team}/sa/cloudassist-backend"
    )

    run(
        [
            "gcloud",
            "projects",
            "add-iam-policy-binding",
            PROJECT_ID,
            f"--member={principal}",
            "--role=roles/aiplatform.user",
            "--condition=None",
            "--quiet",
        ]
    )

    print(f"{team} configured successfully.")

print()
print(f"Successfully processed {len(rows)} teams.")
