# CloudAssist AI Kubernetes Workshop — Participant Guide

## Team rotation rule

One authorized team lead signs in and connects the team to the cluster. Every team member must then complete the full hands-on exercise individually, one after another, using the same assigned namespace.

For each turn, the active member completes Steps 7–16, cleans up the application resources in Step 17, and then gives control to the next member. Do not split the steps between members.

## 1. Sign in

1. Open Google Cloud Console: `https://console.cloud.google.com/`
2. Sign in with the Google Account email provided to the facilitator.
3. Confirm that the selected project is `kubernetes-cloud-workshop`.

## 2. Open Cloud Shell

Click the **Activate Cloud Shell** icon in the top-right corner of Google Cloud Console.


## If Cloud Shell restarts or disconnects

Run this recovery block before continuing. Replace `team-01` with your assigned namespace.

```bash
export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
export TEAM_NAMESPACE="team-01"

gcloud auth list
gcloud config set project "$PROJECT_ID"

gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID"

kubectl config set-context --current \
  --namespace="$TEAM_NAMESPACE"

cd ~/k8-ai-workshop

kubectl config view --minify \
  --output='jsonpath={..namespace}'
echo

kubectl get deployments,pods,services
```

If `gcloud auth list` shows no active account, run:

```bash
gcloud auth login
```

If port-forwarding stopped, restart it:

```bash
kubectl port-forward \
  service/cloudassist-frontend \
  8080:8080
```

## 3. Set your workshop variables

Replace `team-01` with the team namespace assigned to you.

```bash
export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
export TEAM_NAMESPACE="team-01"

gcloud config set project "$PROJECT_ID"
```

## 4. Connect to the cluster

```bash
gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID"
```

## 5. Set your namespace

```bash
kubectl config set-context --current \
  --namespace="$TEAM_NAMESPACE"
```

Verify:

```bash
kubectl config view --minify \
  --output='jsonpath={..namespace}'
echo

kubectl auth can-i create deployments
kubectl auth can-i create namespaces
```

Expected:

```text
yes
no
```

## 6. Get the workshop repository

Clone the workshop repository:

```bash
git clone https://github.com/NarcisseObadiah/k8s-ai-workshop.git k8-ai-workshop
cd k8-ai-workshop
```

If the repository already exists:

```bash
cd ~/k8-ai-workshop
git pull
```

## 7. Deploy the backend

```bash
kubectl apply -f kubernetes/participant/backend.yaml

kubectl rollout status \
  deployment/cloudassist-backend

kubectl get pods,services
```

## 8. Deploy frontend v1

```bash
kubectl apply -f kubernetes/participant/frontend.yaml

kubectl rollout status \
  deployment/cloudassist-frontend

kubectl get deployments,pods,services
```

## 9. Open the application

Run and keep this command open:

```bash
kubectl port-forward \
  service/cloudassist-frontend \
  8080:8080
```

Open **Web Preview → Preview on port 8080**.

## 10. Test the AI application

Enter this prompt in the application:

```text
Explain Kubernetes in two simple sentences.
```

## 11. Check logs and status

```bash
kubectl get deployments,pods,services

kubectl logs deployment/cloudassist-backend \
  --tail=50

kubectl get events \
  --sort-by='.lastTimestamp'
```

## 12. Test Kubernetes self-healing

Terminal 1:

```bash
kubectl get pods -w
```

Terminal 2:

```bash
kubectl delete pod \
  -l app=cloudassist-backend
```

Wait for the replacement backend Pod to show `1/1 Running`.

## 13. Roll out frontend v2

```bash
kubectl set image deployment/cloudassist-frontend \
  frontend=europe-west1-docker.pkg.dev/kubernetes-cloud-workshop/cloudassist/frontend:workshop-v2

kubectl rollout status \
  deployment/cloudassist-frontend
```

Refresh the Web Preview page.

## 14. View rollout history

```bash
kubectl rollout history \
  deployment/cloudassist-frontend
```

## 15. Roll back to v1

```bash
kubectl rollout undo \
  deployment/cloudassist-frontend

kubectl rollout status \
  deployment/cloudassist-frontend
```

Refresh the Web Preview page again.

## 16. Final check

```bash
kubectl get deployments,pods,services
```

Both Deployments must show `READY 1/1`.

## 17. Clean up before the next member

Stop any running port-forward command with `Ctrl+C`, then remove the application resources:

```bash
kubectl delete -f kubernetes/participant/frontend.yaml \
  --ignore-not-found

kubectl delete -f kubernetes/participant/backend.yaml \
  --ignore-not-found
```

Verify that the application resources are gone:

```bash
kubectl get deployments,pods,services
```

The namespace, quota, RoleBinding, and `cloudassist-backend` service account remain available. The next team member now repeats Steps 7–17 from the beginning.