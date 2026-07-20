# CloudAssist AI Operations Guide

This document contains the minimum operational procedures for maintaining and troubleshooting the workshop platform.

Participant-facing steps remain in [PARTICIPANT_GUIDE.md](PARTICIPANT_GUIDE.md).

## Environment Variables

```bash
export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
export REPOSITORY="cloudassist"
export IMAGE_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
```

## Recover After Cloud Shell Reloads

Cloud Shell sessions can stop, reload, or lose shell variables.

### Facilitator recovery

```bash
unset CLOUDSDK_ACTIVE_CONFIG_NAME
unset CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE
unset GOOGLE_APPLICATION_CREDENTIALS

gcloud auth login
gcloud config set project kubernetes-cloud-workshop
gcloud config set compute/region europe-west1

export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
export REPOSITORY="cloudassist"
export IMAGE_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"

gcloud container clusters get-credentials   "$CLUSTER_NAME"   --region="$REGION"   --project="$PROJECT_ID"

cd ~/k8-ai-workshop
kubectl get namespaces
```

### Participant recovery

Replace `team-01` with the assigned namespace:

```bash
gcloud config set project kubernetes-cloud-workshop

gcloud container clusters get-credentials   cloudassist-workshop   --region=europe-west1   --project=kubernetes-cloud-workshop

export TEAM_NAMESPACE="team-01"

kubectl config set-context   --current   --namespace="$TEAM_NAMESPACE"

kubectl config view   --minify   --output='jsonpath={..namespace}'

echo
cd ~/k8-ai-workshop
```

Restart an interrupted port-forward:

```bash
kubectl port-forward   service/cloudassist-frontend   8080:8080
```

## Platform Check

Confirm identity and project:

```bash
gcloud auth list
gcloud config get-value project
```

Confirm cluster connectivity:

```bash
kubectl cluster-info
kubectl get namespaces
```

Check the facilitator workload:

```bash
kubectl get deployments,pods,services   --namespace=cloudassist-demo
```

Validate team access:

```bash
python3 workshop-admin/verify-teams.py teams_lead.csv
```

## Inspect a Team

```bash
export TEAM_NAMESPACE="team-01"

kubectl get deployments,pods,services,hpa   --namespace="$TEAM_NAMESPACE"

kubectl get resourcequota,limitrange,serviceaccount,rolebinding   --namespace="$TEAM_NAMESPACE"
```

## Application Health

```bash
kubectl rollout status   deployment/cloudassist-backend   --namespace="$TEAM_NAMESPACE"

kubectl rollout status   deployment/cloudassist-frontend   --namespace="$TEAM_NAMESPACE"

kubectl get endpoints   --namespace="$TEAM_NAMESPACE"
```

A Service without endpoints usually means its selector does not match a ready Pod.

## Logs and Events

```bash
kubectl logs   deployment/cloudassist-backend   --namespace="$TEAM_NAMESPACE"   --tail=100

kubectl logs   deployment/cloudassist-frontend   --namespace="$TEAM_NAMESPACE"   --tail=100

kubectl get events   --namespace="$TEAM_NAMESPACE"   --sort-by='.lastTimestamp'
```

<!-- Save a logs-and-events screenshot as:
docs/images/operations/logs-and-events.png
-->

## Test Self-Healing

```bash
kubectl delete pod   -l app=cloudassist-backend   --namespace="$TEAM_NAMESPACE"

kubectl get pods   --namespace="$TEAM_NAMESPACE"   --watch
```

<!-- Save the before-and-after output as:
docs/images/operations/pod-self-healing.png
-->

## Roll Out Frontend Version 2

```bash
kubectl set image   deployment/cloudassist-frontend   frontend="${IMAGE_PREFIX}/frontend:workshop-v2"   --namespace="$TEAM_NAMESPACE"

kubectl rollout status   deployment/cloudassist-frontend   --namespace="$TEAM_NAMESPACE"

kubectl rollout history   deployment/cloudassist-frontend   --namespace="$TEAM_NAMESPACE"
```

<!-- Save rollout output and the v2 interface as:
docs/images/operations/rolling-update.png
docs/images/application/frontend-v2.png
-->

## Roll Back

```bash
kubectl rollout undo   deployment/cloudassist-frontend   --namespace="$TEAM_NAMESPACE"

kubectl rollout status   deployment/cloudassist-frontend   --namespace="$TEAM_NAMESPACE"
```

Confirm the image:

```bash
kubectl get deployment cloudassist-frontend   --namespace="$TEAM_NAMESPACE"   -o jsonpath='{.spec.template.spec.containers[0].image}'

echo
```

<!-- Save rollback output as:
docs/images/operations/rollback.png
-->

## Reset a Team

```bash
./workshop-admin/reset-team.sh team-01
```

Confirm the application was removed while the platform controls remain:

```bash
kubectl get deployments,pods,services   --namespace=team-01

kubectl get resourcequota,limitrange,serviceaccount,rolebinding   --namespace=team-01
```

## Common Failures

### Wrong region

Use `europe-west1`, not `europe-west`:

```bash
gcloud container clusters get-credentials   cloudassist-workshop   --region=europe-west1   --project=kubernetes-cloud-workshop
```

### Wrong namespace

```bash
kubectl config view   --minify   --output='jsonpath={..namespace}'

echo

kubectl config set-context   --current   --namespace=team-01
```

### Permission denied

Test the participant identity explicitly:

```bash
kubectl auth can-i create deployments   --namespace=team-01   --as=participant@example.com
```

A facilitator check without `--as` tests the facilitator account and does not prove participant access.

### Backend cannot call Vertex AI

Check the Pod ServiceAccount:

```bash
kubectl get pod   --namespace="$TEAM_NAMESPACE"   -l app=cloudassist-backend   -o jsonpath='{.items[0].spec.serviceAccountName}'

echo
```

Expected:

```text
cloudassist-backend
```

Then inspect logs:

```bash
kubectl logs   deployment/cloudassist-backend   --namespace="$TEAM_NAMESPACE"   --tail=100
```

Re-run provisioning when the namespace IAM binding is missing:

```bash
python3 workshop-admin/provision-teams.py teams_lead.csv
```

### Port 8080 is busy

```bash
ps aux | grep '[k]ubectl port-forward'
```

Stop the old process or use another local port:

```bash
kubectl port-forward   service/cloudassist-frontend   8081:8080   --namespace="$TEAM_NAMESPACE"
```

### Pod remains Pending

```bash
kubectl describe pod   --namespace="$TEAM_NAMESPACE"

kubectl get resourcequota   --namespace="$TEAM_NAMESPACE"
```

## Workshop Cleanup

Reset every participant application while preserving namespaces:

```bash
for namespace in $(kubectl get namespaces   -l workshop=cloudassist   -o jsonpath='{.items[*].metadata.name}'); do
  ./workshop-admin/reset-team.sh "$namespace"
done
```

Delete the facilitator application while keeping its namespace:

```bash
kubectl delete   -f kubernetes/facilitator-funded/application.yaml
```

---------------



