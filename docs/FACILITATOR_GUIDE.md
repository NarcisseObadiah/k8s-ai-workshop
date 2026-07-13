# CloudAssist AI Kubernetes Workshop — Facilitator Guide

Workshop repository: `https://github.com/NarcisseObadiah/k8s-ai-workshop`

## 1. Pre-session prerequisites

Set the funded project context:

```bash
gcloud config configurations activate workshop

gcloud config set account narcisseobadiahdm@gmail.com

gcloud config set project kubernetes-cloud-workshop

export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
```

Connect to the cluster:

```bash
gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID"

kubectl cluster-info
```

Verify images:

```bash
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/kubernetes-cloud-workshop/cloudassist \
  --include-tags \
  --project=kubernetes-cloud-workshop
```

Required tags:

```text
backend:workshop-v1
frontend:workshop-v1
frontend:workshop-v2
```

Verify the participant IAM bridge group:

```bash
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten='bindings[].members' \
  --filter='bindings.members:group:participants@forkit.dev' \
  --format='table(bindings.role,bindings.members)'
```

Required role:

```text
roles/container.clusterViewer
```

Verify all team leads were added to `K8s-ai@googlegroups.com`.


## 2. Recover after a Cloud Shell restart

Use this block whenever Cloud Shell restarts, the named configuration disappears, variables are lost, or `kubectl` has no current context.

```bash
unset CLOUDSDK_ACTIVE_CONFIG_NAME
unset CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE
unset GOOGLE_APPLICATION_CREDENTIALS

gcloud auth list
```

If no account is active:

```bash
gcloud auth login narcisseobadiahdm@gmail.com
```

Recreate or activate the workshop configuration:

```bash
if gcloud config configurations describe workshop \
  >/dev/null 2>&1; then
  gcloud config configurations activate workshop
else
  gcloud config configurations create workshop --activate
fi

gcloud config set account narcisseobadiahdm@gmail.com
gcloud config set project kubernetes-cloud-workshop
gcloud config set compute/region europe-west1

export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
export REPOSITORY="cloudassist"

gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID"

cd ~/k8-ai-workshop

kubectl cluster-info
kubectl config current-context
kubectl get namespaces -l workshop=cloudassist
```

For participant troubleshooting, always specify the namespace explicitly:

```bash
kubectl get deployments,pods,services -n team-01
```

## 3. Provision participant namespaces

Apply the shared participant ClusterRole:

```bash
kubectl apply -f \
  workshop-admin/participant-clusterrole.yaml
```

Provision namespaces from `teams_lead.csv`:

```bash
export PROJECT_ID="kubernetes-cloud-workshop"

./workshop-admin/provision-teams.py \
  teams_lead.csv
```

Verify namespace isolation:

```bash
./workshop-admin/verify-teams.py \
  teams_lead.csv
```

Expected per team:

```text
OWN=yes
OTHER=no
NS-CREATE=no
```

Verify created namespaces:

```bash
kubectl get namespaces \
  -l workshop=cloudassist
```

Inspect one namespace:

```bash
kubectl get \
  resourcequota,limitrange,serviceaccount,rolebinding \
  -n team-01
```

## 4. Final smoke test with a participant identity

Use a real participant account, not the facilitator account.

```bash
gcloud container clusters get-credentials cloudassist-workshop \
  --region=europe-west1 \
  --project=kubernetes-cloud-workshop

kubectl config set-context --current \
  --namespace=team-01

kubectl auth can-i create deployments
kubectl auth can-i create namespaces
```

Expected:

```text
yes
no
```

Deploy both participant manifests:

```bash
kubectl apply -f kubernetes/participant/backend.yaml
kubectl apply -f kubernetes/participant/frontend.yaml

kubectl rollout status deployment/cloudassist-backend
kubectl rollout status deployment/cloudassist-frontend
```

Test the application:

```bash
kubectl port-forward \
  service/cloudassist-frontend \
  8080:8080
```

Open Cloud Shell Web Preview on port `8080` and submit one prompt.

## 5. Team rotation rule

One authorized lead account connects the team to the cluster, but every member must complete the entire participant exercise independently.

For each turn:

1. The active member deploys the backend and frontend.
2. The active member checks Pods, Services, logs, and events.
3. The active member opens the application with port-forwarding.
4. The active member tests self-healing.
5. The active member rolls out frontend v2.
6. The active member rolls back to v1.
7. The active member deletes the application resources.
8. The next member repeats the complete workflow in the same namespace.

Do not divide the exercise into separate tasks. Each member should experience the full deployment and operations lifecycle. The namespace, quota, RoleBinding, and Kubernetes service account remain in place between turns.

## 6. Workshop checkpoints

### Checkpoint 1 — Cloud access

Participant can run:

```bash
gcloud config get-value project
```

Expected:

```text
kubernetes-cloud-workshop
```

### Checkpoint 2 — Cluster connection

Participant can run:

```bash
kubectl cluster-info
```

### Checkpoint 3 — Namespace scope

Participant can run:

```bash
kubectl config view --minify \
  --output='jsonpath={..namespace}'
echo

kubectl auth can-i create deployments
kubectl auth can-i create namespaces
```

Expected: assigned `team-XX`, then `yes`, then `no`.

### Checkpoint 4 — Backend ready

```bash
kubectl get deployment cloudassist-backend
kubectl get pods -l app=cloudassist-backend
```

Expected: Deployment `1/1`; Pod `1/1 Running`.

### Checkpoint 5 — Frontend ready

```bash
kubectl get deployment cloudassist-frontend
kubectl get service cloudassist-frontend
```

Expected: Deployment `1/1`; Service type `ClusterIP`.

### Checkpoint 6 — AI response

Participant opens Web Preview on port `8080` and receives a Gemini response.

### Checkpoint 7 — Self-healing

Participant deletes the backend Pod and observes a replacement Pod become `Running`.

### Checkpoint 8 — v2 rollout

```bash
kubectl get deployment cloudassist-frontend \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
echo
```

Expected tag: `workshop-v2`.

### Checkpoint 9 — rollback

```bash
kubectl rollout history deployment/cloudassist-frontend
```

Expected: at least two revisions.

## 7. Common errors and exact fixes

### No active gcloud account

Error:

```text
You do not currently have an active account selected
```

Fix:

```bash
gcloud auth login

gcloud auth list

gcloud config set account PARTICIPANT_GOOGLE_EMAIL
```

### Wrong project

Check:

```bash
gcloud config get-value project
```

Fix:

```bash
gcloud config set project kubernetes-cloud-workshop
```

### Permission denied during `get-credentials`

Check bridge-group IAM:

```bash
gcloud projects get-iam-policy kubernetes-cloud-workshop \
  --flatten='bindings[].members' \
  --filter='bindings.members:group:participants@forkit.dev' \
  --format='table(bindings.role,bindings.members)'
```

Confirm that the participant was added to `K8s-ai@googlegroups.com` with the same Google Account email used in Cloud Shell.

Retry:

```bash
gcloud container clusters get-credentials cloudassist-workshop \
  --region=europe-west1 \
  --project=kubernetes-cloud-workshop
```

### Participant is forbidden in the assigned namespace

Check the namespace and identity:

```bash
kubectl config view --minify \
  --output='jsonpath={..namespace}'
echo

gcloud auth list
```

Facilitator check:

```bash
kubectl get rolebinding team-participants \
  -n TEAM_NAMESPACE \
  -o yaml

kubectl auth can-i create deployments \
  -n TEAM_NAMESPACE \
  --as=PARTICIPANT_GOOGLE_EMAIL
```

Reapply access:

```bash
./workshop-admin/provision-teams.py teams_lead.csv
```

### Participant can access the wrong namespace

Check all RoleBindings for that email:

```bash
for NS in $(kubectl get namespaces -l workshop=cloudassist -o name); do
  kubectl get rolebinding team-participants \
    -n "${NS#namespace/}" \
    -o yaml 2>/dev/null | \
  grep -B2 -A2 'PARTICIPANT_GOOGLE_EMAIL' && echo "$NS"
done
```

Correct `teams_lead.csv`, then rerun:

```bash
./workshop-admin/provision-teams.py teams_lead.csv
```

### Pod is Pending

```bash
kubectl describe pod POD_NAME

kubectl get events \
  --sort-by='.lastTimestamp'

kubectl describe resourcequota team-quota
```

### ImagePullBackOff or ErrImagePull

```bash
kubectl describe pod POD_NAME

kubectl get deployment DEPLOYMENT_NAME \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
echo
```

Verify tags:

```bash
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/kubernetes-cloud-workshop/cloudassist \
  --include-tags
```

### Backend returns Vertex AI authorization errors

Check the Pod identity and environment:

```bash
kubectl get deployment cloudassist-backend \
  -o jsonpath='{.spec.template.spec.serviceAccountName}'
echo

kubectl get serviceaccount cloudassist-backend

kubectl logs deployment/cloudassist-backend \
  --tail=100
```

Expected service account:

```text
cloudassist-backend
```

Reapply Workload Identity permissions:

```bash
./workshop-admin/provision-teams.py teams_lead.csv
```

### Frontend shows 502 or cannot reach backend

```bash
kubectl get service backend
kubectl get endpoints backend
kubectl get pods -l app=cloudassist-backend
kubectl logs deployment/cloudassist-frontend --tail=100
kubectl logs deployment/cloudassist-backend --tail=100
```

The backend Service name must be `backend` and its endpoint must point to a ready backend Pod.

### Port 8080 is already in use

```bash
kubectl port-forward \
  service/cloudassist-frontend \
  8081:8080
```

Open Web Preview on port `8081`.

### Port-forward is forbidden

Facilitator check:

```bash
kubectl auth can-i create pods/portforward \
  -n TEAM_NAMESPACE \
  --as=PARTICIPANT_GOOGLE_EMAIL
```

Reapply the ClusterRole and team provisioning:

```bash
kubectl apply -f workshop-admin/participant-clusterrole.yaml
./workshop-admin/provision-teams.py teams_lead.csv
```

### Rollout is stuck

```bash
kubectl rollout status deployment/cloudassist-frontend \
  --timeout=2m

kubectl get pods,replicasets
kubectl describe deployment cloudassist-frontend
kubectl get events --sort-by='.lastTimestamp'
```

Rollback:

```bash
kubectl rollout undo deployment/cloudassist-frontend
kubectl rollout status deployment/cloudassist-frontend
```

## 8. Fast reset for one team

Delete only the application resources:

```bash
kubectl delete \
  deployment/cloudassist-backend \
  deployment/cloudassist-frontend \
  service/backend \
  service/cloudassist-frontend \
  -n TEAM_NAMESPACE \
  --ignore-not-found
```

Keep the namespace, quota, RoleBinding, and service account.

## 9. End-of-session checks

List all participant workloads:

```bash
kubectl get pods \
  -A \
  -l 'app in (cloudassist-backend,cloudassist-frontend)'
```

List any accidental public Services:

```bash
kubectl get services -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.spec.type' | \
awk 'NR==1 || $3=="LoadBalancer"'
```

Only the facilitator demo should use a public LoadBalancer.