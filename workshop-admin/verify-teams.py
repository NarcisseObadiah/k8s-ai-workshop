#!/usr/bin/env python3

import csv
import subprocess
import sys
from pathlib import Path

CSV_PATH = Path(sys.argv[1] if len(sys.argv) > 1 else "teams_lead.csv")


def capture(command: list[str]) -> str:
    result = subprocess.run(
        command,
        text=True,
        capture_output=True,
    )

    if result.returncode != 0:
        return f"ERROR: {result.stderr.strip()}"

    return result.stdout.strip()


if not CSV_PATH.exists():
    raise SystemExit(f"CSV file not found: {CSV_PATH}")

with CSV_PATH.open(
    "r",
    encoding="utf-8-sig",
    newline="",
) as csv_file:
    rows = list(csv.DictReader(csv_file))

teams = [
    (row["team"].strip(), row["google_email"].strip().lower())
    for row in rows
]

print(
    f"{'TEAM':<10} "
    f"{'OWN':<6} "
    f"{'POD-DELETE':<12} "
    f"{'OTHER':<7} "
    f"{'NS-CREATE':<10}"
)

print("-" * 55)

failed = False

for index, (team, email) in enumerate(teams):
    other_team = (
        teams[(index + 1) % len(teams)][0]
        if len(teams) > 1
        else "default"
    )

    own = capture(
        [
            "kubectl",
            "auth",
            "can-i",
            "create",
            "deployments",
            "--namespace",
            team,
            "--as",
            email,
        ]
    )

    pod_delete = capture(
        [
            "kubectl",
            "auth",
            "can-i",
            "delete",
            "pods",
            "--namespace",
            team,
            "--as",
            email,
        ]
    )

    other = capture(
        [
            "kubectl",
            "auth",
            "can-i",
            "create",
            "deployments",
            "--namespace",
            other_team,
            "--as",
            email,
        ]
    )

    namespace_create = capture(
        [
            "kubectl",
            "auth",
            "can-i",
            "create",
            "namespaces",
            "--as",
            email,
        ]
    )

    print(
        f"{team:<10} "
        f"{own:<6} "
        f"{pod_delete:<12} "
        f"{other:<7} "
        f"{namespace_create:<10}"
    )

    if (
        own != "yes"
        or pod_delete != "yes"
        or other != "no"
        or namespace_create != "no"
    ):
        failed = True

if failed:
    raise SystemExit(
        "\nOne or more access checks failed."
    )

print("\nAll namespace access checks passed.")
