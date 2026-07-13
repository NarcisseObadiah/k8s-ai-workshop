# CloudAssist AI Workshop

![CloudAssist AI architecture](docs/images/cloudassist-architecture.png)

CloudAssist AI is a full-stack generative AI application deployed on Google Kubernetes Engine and connected securely to Gemini through Vertex AI.

This workshop demonstrates how to deploy, operate, update, troubleshoot, and secure an AI application running on Kubernetes.

## Start Here

### Participants

Follow the complete hands-on workshop instructions:

[Open the Participant Guide](docs/PARTICIPANT_GUIDE.md)


## What Participants Will Do

During the workshop, participants will:

1. Sign in to Google Cloud.
2. Open Google Cloud Shell.
3. Connect to the shared GKE Autopilot cluster.
4. Select their assigned team namespace.
5. Deploy the FastAPI backend.
6. Deploy the React and Nginx frontend.
7. Inspect Deployments, Pods, Services, events, and logs.
8. Open the application using `kubectl port-forward`.
9. Delete a backend Pod and observe Kubernetes self-healing.
10. Upgrade the frontend from version 1 to version 2.
11. Observe the redesigned interface.
12. Roll back to the previous frontend version.

## Architecture

The application follows this request flow:

```text
Browser
  ↓
React frontend
  ↓
Nginx
  ↓
/api/chat
  ↓
FastAPI backend
  ↓
Google Gen AI SDK
  ↓
Vertex AI
  ↓
Gemini
```

The delivery pipeline is:

```text
GitHub
  ↓
Google Cloud Build
  ↓
Artifact Registry
  ↓
GKE Autopilot
```

## Google Cloud Environment

```text
Project: kubernetes-cloud-workshop
Region: europe-west1
Cluster: cloudassist-workshop
Artifact Registry repository: cloudassist
```

Container images:

```text
backend:workshop-v1
frontend:workshop-v1
frontend:workshop-v2
```

## Application Components

### Frontend

The frontend uses:

* React
* TypeScript
* Vite
* Nginx

Nginx serves the React application and forwards `/api/` requests to the backend Kubernetes Service.

Two frontend versions are provided:

```text
workshop-v1 — original interface
workshop-v2 — enhanced workshop interface
```

These versions are used for the rolling-update and rollback exercises.

### Backend

The backend uses:

* Python
* FastAPI
* Uvicorn
* Google Gen AI SDK

It receives prompts from the frontend and sends them to Gemini through Vertex AI.

The backend does not store Gemini API keys or downloadable service-account key files.

## Secure Vertex AI Access

Every namespace contains a Kubernetes service account named:

```text
cloudassist-backend
```

The backend authenticates using:

```text
Backend Pod
  ↓
Kubernetes service account
  ↓
Workload Identity Federation for GKE
  ↓
Google Cloud IAM
  ↓
Vertex AI
```

The workload receives the following role:

```text
roles/aiplatform.user
```

## Participant Isolation

The workshop uses one shared GKE cluster with a separate namespace for each team:

```text
team-01
team-02
team-03
...
team-XX
```

Each namespace includes:

* a ResourceQuota;
* a LimitRange;
* a Kubernetes service account;
* a namespace RoleBinding;
* backend and frontend application resources.

Participants can work only inside their assigned namespace.

They cannot:

* create namespaces;
* administer the cluster;
* access another team’s namespace;
* modify project IAM;
* manage billing;
* create public LoadBalancer Services.

## Participant Application Access

Participant Services use the `ClusterIP` type.

Participants open their application through Cloud Shell:

```bash
kubectl port-forward service/cloudassist-frontend 8080:8080
```

They then use Cloud Shell Web Preview on port `8080`.

## Repository Structure

```text
.
├── backend/
├── frontend/
├── kubernetes/
│   ├── facilitator-funded/
│   └── participant/
├── workshop-admin/
├── docs/
│   ├── images/
│   ├── PARTICIPANT_GUIDE.md
│   └── FACILITATOR_GUIDE.md
└── README.md
```

## Workshop Operations

The main Kubernetes exercises are:

```text
Deploy
→ inspect
→ troubleshoot
→ self-heal
→ roll out v2
→ roll back
```

## Technology Stack

* Google Cloud
* Google Kubernetes Engine Autopilot
* Vertex AI
* Gemini
* Google Gen AI SDK
* Artifact Registry
* Cloud Build
* Workload Identity Federation
* Kubernetes RBAC
* React
* TypeScript
* Nginx
* Python
* FastAPI
