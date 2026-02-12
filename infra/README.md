# Pulumi Infrastructure for Mock-Mock on GCP

This directory contains Pulumi infrastructure-as-code (IaC) for deploying the Mock-Mock API Server on Google Cloud Platform (GCP).

## 🏗️ Architecture

The infrastructure deploys the following GCP resources:

- **Cloud Run**: Serverless container deployment for the Mock-Mock server
- **Artifact Registry**: Docker image repository for container storage
- **Firestore**: NoSQL database for persistent mock data storage
- **Secret Manager**: Secure storage for Firebase service account credentials
- **IAM**: Service accounts and role bindings with least-privilege access
- **Cloud Monitoring**: Dashboards, alerts, and logging

## 📋 Prerequisites

### Required Tools
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) (v3.0+)
- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install)
- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://docs.docker.com/get-docker/)

### GCP Requirements
- GCP Project with billing enabled
- Appropriate IAM permissions:
  - `roles/owner` (for initial setup) OR
  - `roles/editor` + `roles/iam.securityAdmin` + `roles/resourcemanager.projectIamAdmin`

## 🚀 Quick Start

### 1. Bootstrap Your GCP Project

Run the bootstrap script to set up your GCP project:

```bash
cd infra/scripts
./bootstrap-project.sh <YOUR_PROJECT_ID> <REGION> <ENVIRONMENT>
```

Example:
```bash
./bootstrap-project.sh my-company-dev us-central1 dev
```

This script:
- Enables required GCP APIs
- Creates Pulumi state bucket in GCS
- Configures Docker for Artifact Registry
- Initializes Firestore database
- Provides next steps

### 2. Login to Pulumi (GCS Backend)

```bash
pulumi login gs://<YOUR_PROJECT_ID>-pulumi-state
```

### 3. Install Dependencies

```bash
cd infra
npm install
```

### 4. Initialize Pulumi Stack

```bash
pulumi stack init dev
```

### 5. Configure Your Stack

Set required configuration values:

```bash
# GCP Configuration
pulumi config set gcp:project <YOUR_PROJECT_ID>
pulumi config set gcp:region us-central1

# Application Configuration
pulumi config set mock-mock:environment dev
pulumi config set mock-mock:appVersion dev
pulumi config set mock-mock:serviceAccountJsonPath ./secrets/firebase-dev.json

# Optional: Advanced Configuration
pulumi config set mock-mock:minInstances 0
pulumi config set mock-mock:maxInstances 5
pulumi config set mock-mock:memory 256Mi
pulumi config set mock-mock:corsOrigins "https://yourdomain.com"
pulumi config set mock-mock:notificationEmail your-email@example.com
```

### 6. Prepare Firebase Service Account (Optional)

If using Firestore, download a Firebase service account JSON key:

1. Go to [GCP Console > IAM & Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create a service account with `Cloud Datastore User` role
3. Create and download a JSON key
4. Save it as `infra/secrets/firebase-<ENVIRONMENT>.json`

### 7. Preview Deployment

```bash
pulumi preview
```

Review the resources that will be created.

### 8. Deploy Infrastructure

```bash
pulumi up
```

Confirm the deployment when prompted.

### 9. Access Your Service

After deployment, Pulumi will output the service URL:

```bash
pulumi stack output serviceUrl
```

Visit this URL to access your Mock-Mock server!

## 📁 Project Structure

```
infra/
├── Pulumi.yaml                 # Project definition
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
├── index.ts                    # Main infrastructure program
├── config/
│   ├── Pulumi.dev.yaml        # Dev environment config
│   └── Pulumi.prod.yaml       # Prod environment config
├── components/
│   ├── artifact-registry.ts   # Artifact Registry component
│   ├── cloud-run.ts           # Cloud Run service component
│   ├── firestore.ts           # Firestore database component
│   ├── secrets.ts             # Secret Manager component
│   ├── iam.ts                 # IAM roles and service accounts
│   └── monitoring.ts          # Monitoring and alerts
├── scripts/
│   ├── bootstrap-project.sh   # GCP project setup script
│   └── setup-state-backend.sh # Pulumi state bucket setup
└── secrets/                   # Git-ignored directory for credentials
    └── .gitkeep
```

## ⚙️ Configuration Reference

### Required Configuration

| Key | Description | Example |
|-----|-------------|---------|
| `gcp:project` | GCP Project ID | `my-company-dev` |
| `gcp:region` | Primary GCP region | `us-central1` |
| `mock-mock:environment` | Environment name | `dev` or `prod` |

### Optional Configuration

| Key | Description | Default |
|-----|-------------|---------|
| `mock-mock:appVersion` | Docker image tag | `latest` |
| `mock-mock:minInstances` | Min Cloud Run instances | `0` (dev), `1` (prod) |
| `mock-mock:maxInstances` | Max Cloud Run instances | `10` |
| `mock-mock:memory` | Memory allocation | `256Mi` (dev), `512Mi` (prod) |
| `mock-mock:cpu` | CPU allocation | `1` |
| `mock-mock:useMinimalImage` | Use minimal Docker image | `false` |
| `mock-mock:firestoreRegion` | Firestore region | Same as `gcp:region` |
| `mock-mock:allowUnauthenticated` | Allow public access | `true` (dev), `false` (prod) |
| `mock-mock:corsOrigins` | Allowed CORS origins | `*` (dev), specific domains (prod) |
| `mock-mock:domainMapping` | Custom domain | `` (none) |
| `mock-mock:notificationEmail` | Alert email address | `` (none) |
| `mock-mock:serviceAccountJsonPath` | Firebase service account path | `` (creates placeholder) |

## 🔐 Security Best Practices

### 1. Least Privilege IAM
The infrastructure creates a dedicated service account with minimal permissions:
- `roles/datastore.user` - Firestore access
- `roles/secretmanager.secretAccessor` - Secret access
- `roles/logging.logWriter` - Cloud Logging
- `roles/cloudtrace.agent` - Cloud Trace

### 2. Secret Management
Firebase credentials are stored in GCP Secret Manager, not in code or environment variables.

### 3. CORS Configuration
Configure `corsOrigins` to restrict allowed origins in production:
```bash
pulumi config set mock-mock:corsOrigins "https://app.example.com,https://admin.example.com"
```

### 4. Unauthenticated Access
Disable public access in production:
```bash
pulumi config set mock-mock:allowUnauthenticated false
```

Then configure IAM to allow specific users/services:
```bash
gcloud run services add-iam-policy-binding mock-mock-server-prod \
  --region=us-central1 \
  --member="user:user@example.com" \
  --role="roles/run.invoker"
```

### 5. Firestore Security Rules
Deploy Firestore security rules to restrict data access (not managed by Pulumi).

## 🔄 Multi-User & Multi-Environment Setup

### Separate Stacks for Each Environment

Each user/environment uses a separate Pulumi stack:

```bash
# Create dev stack
pulumi stack init dev
pulumi config set gcp:project my-company-dev

# Create prod stack  
pulumi stack init prod
pulumi config set gcp:project my-company-prod
```

### State Management

Pulumi state is stored in GCS buckets, one per project:
- Dev: `gs://my-company-dev-pulumi-state`
- Prod: `gs://my-company-prod-pulumi-state`

Multiple users can work on the same stack with proper GCS permissions.

### User-Specific Configuration

Each developer can have their own stack:

```bash
pulumi stack init alice-dev
pulumi stack init bob-dev
```

## 🤖 CI/CD with GitHub Actions

### Prerequisites

1. **Set up Workload Identity Federation** (recommended, no long-lived keys):
   ```bash
   # See: https://github.com/google-github-actions/auth#setup
   ```

2. **Configure GitHub Secrets**:
   - `WIF_PROVIDER_DEV` - Workload Identity Provider for dev
   - `WIF_SERVICE_ACCOUNT_DEV` - Service account email for dev
   - `WIF_PROVIDER_PROD` - Workload Identity Provider for prod
   - `WIF_SERVICE_ACCOUNT_PROD` - Service account email for prod
   - `GCP_PROJECT_ID_DEV` - Dev project ID
   - `GCP_PROJECT_ID_PROD` - Prod project ID
   - `GCP_REGION` - Deployment region
   - `FIREBASE_SERVICE_ACCOUNT_DEV` - Firebase SA JSON (dev)
   - `FIREBASE_SERVICE_ACCOUNT_PROD` - Firebase SA JSON (prod)
   - `PULUMI_ACCESS_TOKEN` - Pulumi Cloud token (if using Pulumi Cloud instead of GCS)

### Workflow Triggers

The GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on:
- **Push to `develop`**: Deploys to dev environment
- **Pull request to `main`**: Previews prod deployment
- **Push to `main`**: Deploys to prod (requires approval)
- **Manual trigger**: Deploy any environment on demand

## 📊 Monitoring & Observability

### Dashboards

Access the monitoring dashboard:
```bash
pulumi stack output dashboardUrl
```

Or visit: [GCP Cloud Monitoring](https://console.cloud.google.com/monitoring)

### Alerts

In production, alerts are configured for:
- Error rate > 5%
- P95 latency > 2 seconds

Alerts are sent to the email configured in `notificationEmail`.

### Logs

View Cloud Run logs:
```bash
gcloud run services logs read mock-mock-server-prod --limit=50
```

Or in console: [Cloud Logging](https://console.cloud.google.com/logs)

## 🛠️ Common Operations

### Update Application Code

```bash
# Build will happen automatically on pulumi up
pulumi up
```

### Scale Service

```bash
pulumi config set mock-mock:maxInstances 20
pulumi up
```

### Update Environment Variables

```bash
pulumi config set mock-mock:corsOrigins "https://newdomain.com"
pulumi up
```

### Rollback Deployment

```bash
# View deployment history
pulumi stack history

# Rollback to specific version
pulumi stack export --version <VERSION> > rollback.json
pulumi stack import --file rollback.json

# Orrevert code and redeploy
git revert <commit>
pulumi up
```

### Destroy Infrastructure

```bash
# Preview destruction
pulumi destroy --preview

# Destroy (requires confirmation)
pulumi destroy
```

### Switch Between Environments

```bash
# List stacks
pulumi stack ls

# Switch to prod
pulumi stack select prod

# View current config
pulumi config
```

## 🐛 Troubleshooting

### ERROR: "Project does not exist"
- Verify project ID: `gcloud config get-value project`
- Ensure billing is enabled
- Run bootstrap script: `./scripts/bootstrap-project.sh`

### ERROR: "Docker authentication failed"
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### ERROR: "Firestore database already exists"
- Normal if database was created previously
- Check database mode is FIRESTORE_NATIVE (not Datastore mode)

### ERROR: "Secret not found"
- Create Firebase service account JSON
- Save to `infra/secrets/firebase-<env>.json`
- Or update the secret manually:
  ```bash
  gcloud secrets create firebase-service-account-dev --data-file=<path>
  ```

### Cloud Run service not accessible
- Check if `allowUnauthenticated` is set to `true` for dev
- Verify CORS origins are configured correctly
- Check Cloud Run logs for errors: `gcloud run services logs read <service>`

### Build fails in CI/CD
- Verify GitHub secrets are set correctly
- Check Workload Identity Federation is configured
- Ensure service account has necessary IAM permissions

## 📚 Additional Resources

- [Pulumi GCP Documentation](https://www.pulumi.com/docs/clouds/gcp/)
- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GCP Best Practices](https://cloud.google.com/architecture/framework)

## 🤝 Contributing

When making infrastructure changes:
1. Test in dev environment first
2. Create a pull request
3. Review Pulumi preview output in PR
4. Obtain approval before merging
5. Monitor deployment in prod

## 📝 License

Same as parent project.
