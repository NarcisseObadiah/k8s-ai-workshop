# CloudAssist AI Implementation Guide

This guide documents the minimum process used to build and deploy the CloudAssist AI workshop platform.

It is intended for engineers reviewing or reproducing the platform. Participant exercises remain in [PARTICIPANT_GUIDE.md](PARTICIPANT_GUIDE.md).

## 1. Prerequisites

Required tools and access:

- Google Cloud project with billing enabled;
- `gcloud`;
- `kubectl`;
- Docker and Docker Compose for local testing;
- Python 3;
- permission to manage GKE, Artifact Registry, Cloud Build, IAM, and Vertex AI.

Clone the repository:

```bash
git clone https://github.com/NarcisseObadiah/k8s-ai-workshop.git
cd k8s-ai-workshop
```

## 2. Run the Application Locally

```bash
docker compose up --build
```

Open:

```text
Frontend: http://localhost:8081
Backend:  http://localhost:8080
```

Stop the containers:

```bash
docker compose down
```

<!-- Save a local interface screenshot as:
docs/images/application/local-application.png
-->

## 3. Configure Google Cloud

```bash
export PROJECT_ID="kubernetes-cloud-workshop"
export REGION="europe-west1"
export CLUSTER_NAME="cloudassist-workshop"
export REPOSITORY="cloudassist"

gcloud auth login
gcloud config set project "$PROJECT_ID"
gcloud config set compute/region "$REGION"
```

Enable the required APIs:

```bash
gcloud services enable   artifactregistry.googleapis.com   cloudbuild.googleapis.com   container.googleapis.com   aiplatform.googleapis.com   iam.googleapis.com   iamcredentials.googleapis.com
```

## 4. Create Artifact Registry

```bash
gcloud artifacts repositories create "$REPOSITORY"   --repository-format=docker   --location="$REGION"   --description="CloudAssist workshop container images"

export IMAGE_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
```

## 5. Build the Container Images

Backend:

```bash
gcloud builds submit backend   --tag "${IMAGE_PREFIX}/backend:workshop-v1"
```

Frontend version 1:

```bash
gcloud builds submit frontend   --tag "${IMAGE_PREFIX}/frontend:workshop-v1"
```

Enhanced frontend version:

```bash
gcloud builds submit frontend   --tag "${IMAGE_PREFIX}/frontend:workshop-v2"
```

List the images:

```bash
gcloud artifacts docker images list   "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"   --include-tags
```

<!-- Save the image-list screenshot as:
docs/images/infrastructure/artifact-registry-images.png
-->

## 6. Create the GKE Autopilot Cluster

```bash
gcloud container clusters create-auto "$CLUSTER_NAME"   --location="$REGION"   --project="$PROJECT_ID"
```

Connect `kubectl`:

```bash
gcloud container clusters get-credentials "$CLUSTER_NAME"   --region="$REGION"   --project="$PROJECT_ID"
```

Verify:

```bash
kubectl cluster-info
kubectl get namespaces

gcloud container clusters describe "$CLUSTER_NAME"   --location="$REGION"   --format="value(autopilot.enabled)"
```

<!-- Save the cluster overview as:
docs/images/infrastructure/gke-cluster-overview.png
-->

## 7. Deploy the Facilitator Demonstration

Create the namespace and Kubernetes ServiceAccount:

```bash
export FACILITATOR_NAMESPACE="cloudassist-demo"

kubectl create namespace "$FACILITATOR_NAMESPACE"   --dry-run=client -o yaml | kubectl apply -f -

kubectl create serviceaccount cloudassist-backend   --namespace="$FACILITATOR_NAMESPACE"   --dry-run=client -o yaml | kubectl apply -f -
```

Grant keyless Vertex AI access:

```bash
export PROJECT_NUMBER="$(
  gcloud projects describe "$PROJECT_ID"     --format='value(projectNumber)'
)"

export FACILITATOR_PRINCIPAL="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${PROJECT_ID}.svc.id.goog/subject/ns/${FACILITATOR_NAMESPACE}/sa/cloudassist-backend"

gcloud projects add-iam-policy-binding "$PROJECT_ID"   --member="$FACILITATOR_PRINCIPAL"   --role="roles/aiplatform.user"   --condition=None
```

Deploy:

```bash
kubectl apply   -f kubernetes/facilitator-funded/application.yaml

kubectl rollout status   deployment/cloudassist-backend   --namespace="$FACILITATOR_NAMESPACE"

kubectl rollout status   deployment/cloudassist-frontend   --namespace="$FACILITATOR_NAMESPACE"

kubectl get service cloudassist-frontend   --namespace="$FACILITATOR_NAMESPACE"
```

<!-- Save the demonstration interface as:
docs/images/application/facilitator-demo.png
-->

## 8. Install Participant RBAC

Apply the shared ClusterRole once:

```bash
kubectl apply   -f workshop-admin/participant-clusterrole.yaml

kubectl get clusterrole cloudassist-participant
```

The ClusterRole defines the allowed workshop operations. Namespace RoleBindings determine where each participant may use those permissions.

## 9. Prepare the Team File

Create a private working CSV:

```bash
cp workshop-admin/teams_lead.example.csv teams_lead.csv
```

Required header:

```csv
team,team_lead,google_email,member_2,member_3
```

Example:

```csv
team-01,Team Lead,lead@example.com,Member Two,Member Three
```

Do not commit the real `teams_lead.csv`. It contains participant personal information.

## 10. Provision Team Namespaces

```bash
export PROJECT_ID="kubernetes-cloud-workshop"

python3 workshop-admin/provision-teams.py teams_lead.csv
```

For each row, the script creates or updates:

- the namespace;
- namespace labels;
- `ResourceQuota`;
- `LimitRange`;
- the `cloudassist-backend` Kubernetes ServiceAccount;
- the participant RoleBinding;
- the namespace-specific Vertex AI IAM binding.

Inspect a team:

```bash
kubectl get namespaces -l workshop=cloudassist

kubectl get resourcequota,limitrange,serviceaccount,rolebinding   --namespace=team-01
```

<!-- Save namespace provisioning output as:
docs/images/infrastructure/team-namespaces.png
-->

## 11. Validate Participant Isolation

```bash
python3 workshop-admin/verify-teams.py teams_lead.csv
```

Expected result for every team lead:

```text
OWN=yes
POD-DELETE=yes
OTHER=no
NS-CREATE=no
```

## 12. Deploy a Participant Workload

```bash
export TEAM_NAMESPACE="team-01"

kubectl config set-context   --current   --namespace="$TEAM_NAMESPACE"

kubectl apply   -f kubernetes/participant/backend.yaml

kubectl apply   -f kubernetes/participant/frontend.yaml

kubectl rollout status deployment/cloudassist-backend
kubectl rollout status deployment/cloudassist-frontend
kubectl get deployments,pods,services
```

Open the application:

```bash
kubectl port-forward   service/cloudassist-frontend   8080:8080
```

## 13. Validate Kubernetes Operations

Self-healing:

```bash
kubectl delete pod   -l app=cloudassist-backend

kubectl get pods --watch
```

Roll out frontend v2:

```bash
kubectl set image deployment/cloudassist-frontend   frontend="${IMAGE_PREFIX}/frontend:workshop-v2"

kubectl rollout status   deployment/cloudassist-frontend
```

Roll back:

```bash
kubectl rollout undo   deployment/cloudassist-frontend

kubectl rollout status   deployment/cloudassist-frontend
```

## 14. Reset the Team

```bash
./workshop-admin/reset-team.sh team-01
```

The reset removes the application Deployments, Services, and backend HPA. It preserves the namespace, RBAC, quota, LimitRange, and Kubernetes ServiceAccount so another participant can repeat the complete exercise.

## 15. Documentation Images

Create the image directories:

```bash
mkdir -p   docs/images/architecture   docs/images/application   docs/images/infrastructure   docs/images/operations   docs/images/workshop
```

Recommended screenshots:

| Step | Image path |
|---|---|
| Local application | `docs/images/application/local-application.png` |
| Artifact Registry images | `docs/images/infrastructure/artifact-registry-images.png` |
| GKE cluster overview | `docs/images/infrastructure/gke-cluster-overview.png` |
| Facilitator application | `docs/images/application/facilitator-demo.png` |
| Team provisioning | `docs/images/infrastructure/team-namespaces.png` |

Remove or blur account emails, billing data, tokens, and participant information before committing screenshots.

## Related Documentation

- [Architecture](architecture.md)
- [Operations and Guide](operations-and-security.md)
- [Security and access Guide](security-and-access.md)
- [Implementation Guide](implementation-guide.md)
- [Participant Guide](PARTICIPANT_GUIDE.md)