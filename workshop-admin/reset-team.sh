#!/usr/bin/env bash

set -euo pipefail

TEAM="${1:-}"

if [[ ! "$TEAM" =~ ^team-[0-9]{2}$ ]]; then
  echo "Usage: $0 team-01"
  exit 1
fi

echo "Resetting application resources in ${TEAM}"

kubectl delete deployment \
  cloudassist-backend \
  cloudassist-frontend \
  --namespace="$TEAM" \
  --ignore-not-found

kubectl delete service \
  backend \
  cloudassist-frontend \
  --namespace="$TEAM" \
  --ignore-not-found

kubectl delete horizontalpodautoscaler \
  cloudassist-backend \
  --namespace="$TEAM" \
  --ignore-not-found

echo "${TEAM} reset complete."
