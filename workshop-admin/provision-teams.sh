#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-kubernetes-cloud-workshop}"
CSV_FILE="${1:-teams_lead.csv}"
EXPECTED_HEADER="team,team_lead,google_email,member_2,member_3"

trim() {
  local value="${1//$'\r'/}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

if [[ ! -f "$CSV_FILE" ]]; then
  echo "CSV not found: $CSV_FILE"
  exit 1
fi

ACTUAL_HEADER="$(head -n 1 "$CSV_FILE" | tr -d '\r')"

if [[ "$ACTUAL_HEADER" != "$EXPECTED_HEADER" ]]; then
  echo "Incorrect CSV header."
  echo "Expected: $EXPECTED_HEADER"
  echo "Found:    $ACTUAL_HEADER"
  exit 1
fi

PROJECT_NUMBER="$(
  gcloud projects describe "$PROJECT_ID" \
    --format='value(projectNumber)'
)"

if [[ -z "$PROJECT_NUMBER" ]]; then
  echo "Unable to determine project number."
  exit 1
fi

kubectl get clusterrole cloudassist-participant \
  >/dev/null

while IFS=, read -r \
  TEAM TEAM_LEAD GOOGLE_EMAIL MEMBER_2 MEMBER_3; do

  TEAM="$(trim "${TEAM:-}")"
  TEAM_LEAD="$(trim "${TEAM_LEAD:-}")"
  GOOGLE_EMAIL="$(trim "${GOOGLE_EMAIL:-}")"

  # Skip the header and empty rows.
  if [[ "$TEAM" == "team" || -z "$TEAM" ]]; then
    continue
  fi

  if [[ ! "$TEAM" =~ ^team-[0-9]{2}$ ]]; then
    echo "Invalid team value: $TEAM"
    echo "Expected format: team-01"
    exit 1
  fi

  if [[ -z "$TEAM_LEAD" ]]; then
    echo "Missing team lead for $TEAM"
    exit 1
  fi

  if [[ ! "$GOOGLE_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    echo "Invalid or missing Google Account email for $TEAM"
    exit 1
  fi

  echo
  echo "Provisioning $TEAM"
  echo "Lead:  $TEAM_LEAD"
  echo "Email: $GOOGLE_EMAIL"

  # Namespace
  kubectl create namespace "$TEAM" \
    --dry-run=client \
    -o yaml |
  kubectl apply -f -

  kubectl label namespace "$TEAM" \
    workshop=cloudassist \
    --overwrite

  kubectl annotate namespace "$TEAM" \
    "workshop/team-lead=${TEAM_LEAD}" \
    "workshop/lead-email=${GOOGLE_EMAIL}" \
    --overwrite

  # Quota, limits and workload identity.
  cat <<YAML | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: ${TEAM}
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "10"
    services: "5"
    services.loadbalancers: "0"
    services.nodeports: "0"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: team-defaults
  namespace: ${TEAM}
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 500m
        memory: 1Gi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cloudassist-backend
  namespace: ${TEAM}
YAML

  # Only the team lead receives direct namespace access.
  kubectl create rolebinding team-participants \
    --namespace="$TEAM" \
    --clusterrole=cloudassist-participant \
    --user="$GOOGLE_EMAIL" \
    --dry-run=client \
    -o yaml |
  kubectl apply -f -

  # Permit this namespace's backend KSA to call Vertex AI.
  PRINCIPAL="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${PROJECT_ID}.svc.id.goog/subject/ns/${TEAM}/sa/cloudassist-backend"

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$PRINCIPAL" \
    --role="roles/aiplatform.user" \
    --condition=None \
    --quiet >/dev/null

  echo "$TEAM successfully configured."
done < "$CSV_FILE"

echo
echo "All teams successfully processed."
