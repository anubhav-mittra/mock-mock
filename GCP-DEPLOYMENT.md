# GCP Deployment Guide for Mock-Mock Server

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [GCP Cloud Run Deployment](#gcp-cloud-run-deployment)
3. [GCP GKE Deployment](#gcp-gke-deployment)
4. [Cloud Build CI/CD](#cloud-build-cicd)
5. [Best Practices](#best-practices)

## Prerequisites

- Google Cloud SDK installed (`gcloud`)
- GCP project with billing enabled
- Appropriate IAM permissions
- Docker installed locally (for testing)

```bash
# Authenticate with GCP
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com
```

## GCP Cloud Run Deployment

Cloud Run is the recommended deployment method for this mock server - serverless, auto-scaling, and cost-effective.

### Quick Deploy (Minimal Image - Recommended)

```bash
# 1. Build and tag the minimal image for GCP
docker build -f Dockerfile.minimal -t gcr.io/YOUR_PROJECT_ID/mock-mock:minimal .

# 2. Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/mock-mock:minimal

# 3. Deploy to Cloud Run
gcloud run deploy mock-mock-server \
  --image gcr.io/YOUR_PROJECT_ID/mock-mock:minimal \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars NODE_ENV=production,USE_FIRESTORE=false
```

### Deploy with Firebase/Firestore Support

```bash
# 1. Build standard image
docker build -t gcr.io/YOUR_PROJECT_ID/mock-mock:latest .

# 2. Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/mock-mock:latest

# 3. Create a secret for Firebase service account
gcloud secrets create firebase-service-account \
  --data-file=./path/to/serviceAccountKey.json

# 4. Deploy with Firestore enabled
gcloud run deploy mock-mock-server \
  --image gcr.io/YOUR_PROJECT_ID/mock-mock:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars USE_FIRESTORE=true \
  --set-secrets /app/server/src/path/to/serviceAccountKey.json=firebase-service-account:latest
```

### Configure Firestore (if needed)

```bash
# Enable Firestore API
gcloud services enable firestore.googleapis.com

# Create Firestore database
gcloud firestore databases create --region=us-central1
```

## GCP GKE Deployment

For Kubernetes deployment on Google Kubernetes Engine:

### Create GKE Cluster

```bash
# Create a minimal GKE cluster
gcloud container clusters create mock-mock-cluster \
  --region us-central1 \
  --num-nodes 2 \
  --machine-type e2-medium \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 5
```

### Deploy to GKE

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mock-mock-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mock-mock
  template:
    metadata:
      labels:
        app: mock-mock
    spec:
      containers:
      - name: mock-mock
        image: gcr.io/YOUR_PROJECT_ID/mock-mock:minimal
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        - name: USE_FIRESTORE
          value: "false"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: mock-mock-service
spec:
  type: LoadBalancer
  selector:
    app: mock-mock
  ports:
  - port: 80
    targetPort: 8080
```

```bash
# Apply the deployment
kubectl apply -f deployment.yaml

# Get the external IP
kubectl get service mock-mock-service
```

## Cloud Build CI/CD

Automated builds and deployments using Cloud Build.

### Setup Cloud Build Trigger

```bash
# Connect your GitHub repository
gcloud builds triggers create github \
  --repo-name=mock-mock \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

The included `cloudbuild.yaml` will automatically:
1. Build both standard and minimal Docker images
2. Tag with commit SHA and 'latest'
3. Push to Google Container Registry
4. (Optional) Deploy to Cloud Run

### Manual Cloud Build

```bash
# Submit a build manually
gcloud builds submit --config cloudbuild.yaml .
```

## Cost Optimization

### Cloud Run Cost Tips

1. **Use Minimal Image**: ~40% smaller saves on cold start times and egress
2. **Min Instances**: Set to 0 for dev/test environments
3. **Memory Allocation**: Start with 256Mi for minimal image
4. **CPU Allocation**: Use 1 CPU (scales with requests)
5. **Timeout**: Set appropriate timeout (default 60s is fine)

### Estimated Costs (Cloud Run - Minimal Image)

With minimal traffic (<1000 requests/day):
- **~$0-2/month** - Falls within free tier
- CPU: 180,000 vCPU-seconds/month free
- Memory: 360,000 GiB-seconds/month free
- Requests: 2 million requests/month free

## Best Practices for GCP

### 1. **Use Artifact Registry** (Recommended over Container Registry)

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create mock-mock \
  --repository-format=docker \
  --location=us-central1

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push
docker build -f Dockerfile.minimal \
  -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mock-mock/server:minimal .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mock-mock/server:minimal
```

### 2. **Enable Binary Authorization** (Production)

```bash
gcloud services enable binaryauthorization.googleapis.com

# Create attestor and policy to ensure only verified images run
```

### 3. **Use Secret Manager** for Sensitive Data

```bash
# Store Firebase credentials
gcloud secrets create firebase-key --data-file=serviceAccountKey.json

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding firebase-key \
  --member=serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### 4. **Monitoring and Logging**

```bash
# View logs
gcloud run services logs read mock-mock-server --limit 50

# Set up log-based metrics and alerts in Cloud Monitoring
```

### 5. **Security**

- ✅ Non-root user (already configured in Dockerfile)
- ✅ Minimal base image (Alpine)
- ✅ No hardcoded secrets
- ✅ Use VPC connectors for private resources
- ✅ Enable Cloud Armor for DDoS protection (if needed)

### 6. **Performance**

```bash
# Deploy in multiple regions for global availability
REGIONS=("us-central1" "europe-west1" "asia-east1")
for region in "${REGIONS[@]}"; do
  gcloud run deploy mock-mock-server-$region \
    --image gcr.io/YOUR_PROJECT_ID/mock-mock:minimal \
    --region $region \
    --platform managed
done
```

## Health Checks

The Docker images are configured for GCP health checks. Cloud Run automatically monitors the service, but for GKE use:

```yaml
livenessProbe:
  httpGet:
    path: /mock-endpoint  # or any valid endpoint from your spec
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

## Troubleshooting

### Container exits immediately

```bash
# Check logs
gcloud run services logs read mock-mock-server --limit 100

# Common issues:
# - PORT environment variable not set (should be 8080)
# - Missing dependencies (ensure uuid is in package.json)
# - File permissions (use --chown in COPY commands)
```

### High memory usage

```bash
# Increase memory allocation
gcloud run services update mock-mock-server --memory 512Mi
```

### Cold start latency

```bash
# Set minimum instances
gcloud run services update mock-mock-server --min-instances 1
```

## Support Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Container Registry Best Practices](https://cloud.google.com/container-registry/docs/best-practices)
