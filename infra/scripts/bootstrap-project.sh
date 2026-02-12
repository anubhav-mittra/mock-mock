#!/bin/bash

# Bootstrap GCP Project for Mock-Mock Deployment
# This script performs initial setup of a GCP project for deploying Mock-Mock
# Usage: ./bootstrap-project.sh <project-id> <region> <environment>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 3 ]; then
    echo -e "${RED}Error: Invalid number of arguments${NC}"
    echo "Usage: $0 <project-id> <region> <environment>"
    echo "Example: $0 my-project-123 us-central1 dev"
    exit 1
fi

PROJECT_ID=$1
REGION=$2
ENVIRONMENT=$3

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Bootstrapping GCP Project for Mock-Mock          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Project ID:  ${PROJECT_ID}"
echo "Region:      ${REGION}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}→ Checking prerequisites...${NC}"
if ! command_exists gcloud; then
    echo -e "${RED}✗ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

if ! command_exists pulumi; then
    echo -e "${RED}✗ Pulumi CLI not found. Please install: https://www.pulumi.com/docs/get-started/install/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Set active project
echo -e "${YELLOW}→ Setting active GCP project...${NC}"
gcloud config set project "${PROJECT_ID}"
echo -e "${GREEN}✓ Project set to ${PROJECT_ID}${NC}"

# Check billing is enabled
echo -e "${YELLOW}→ Checking if billing is enabled...${NC}"
BILLING_ENABLED=$(gcloud beta billing projects describe "${PROJECT_ID}" --format="value(billingEnabled)" 2>/dev/null || echo "false")
if [ "${BILLING_ENABLED}" = "false" ]; then
    echo -e "${RED}✗ Billing is not enabled for this project${NC}"
    echo "Please enable billing: https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
    exit 1
fi
echo -e "${GREEN}✓ Billing is enabled${NC}"

# Enable required APIs
echo -e "${YELLOW}→ Enabling required GCP APIs (this may take a few minutes)...${NC}"
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    serviceusage.googleapis.com \
    run.googleapis.com \
    firestore.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com \
    storage-api.googleapis.com \
    storage-component.googleapis.com \
    --project="${PROJECT_ID}"

echo -e "${GREEN}✓ Required APIs enabled${NC}"

# Setup Pulumi state backend
echo -e "${YELLOW}→ Setting up Pulumi state backend...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/setup-state-backend.sh" "${PROJECT_ID}" "${REGION}"

# Configure Docker for Artifact Registry
echo -e "${YELLOW}→ Configuring Docker authentication for Artifact Registry...${NC}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
echo -e "${GREEN}✓ Docker configured${NC}"

# Initialize Firestore (if not already done)
echo -e "${YELLOW}→ Checking Firestore database...${NC}"
FIRESTORE_EXISTS=$(gcloud firestore databases list --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "(default)" || echo "0")

if [ "${FIRESTORE_EXISTS}" = "0" ]; then
    echo -e "${YELLOW}→ Creating Firestore database...${NC}"
    gcloud firestore databases create \
        --location="${REGION}" \
        --type=firestore-native \
        --project="${PROJECT_ID}"
    echo -e "${GREEN}✓ Firestore database created${NC}"
else
    echo -e "${GREEN}✓ Firestore database already exists${NC}"
fi

# Create directory for secrets if it doesn't exist
mkdir -p "${SCRIPT_DIR}/../secrets"

# Check if Firebase service account exists
if [ ! -f "${SCRIPT_DIR}/../secrets/firebase-${ENVIRONMENT}.json" ]; then
    echo -e "${YELLOW}⚠ Firebase service account JSON not found${NC}"
    echo "  Create a service account and download the key:"
    echo "  1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=${PROJECT_ID}"
    echo "  2. Create service account with Firestore permissions"
    echo "  3. Download JSON key and save as: infra/secrets/firebase-${ENVIRONMENT}.json"
    echo ""
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Bootstrap Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "${YELLOW}1. Login to Pulumi with GCS backend:${NC}"
echo -e "   ${GREEN}pulumi login gs://${PROJECT_ID}-pulumi-state${NC}"
echo ""
echo -e "${YELLOW}2. Navigate to infrastructure directory:${NC}"
echo -e "   ${GREEN}cd infra${NC}"
echo ""
echo -e "${YELLOW}3. Install dependencies:${NC}"
echo -e "   ${GREEN}npm install${NC}"
echo ""
echo -e "${YELLOW}4. Initialize Pulumi stack:${NC}"
echo -e "   ${GREEN}pulumi stack init ${ENVIRONMENT}${NC}"
echo ""
echo -e "${YELLOW}5. Configure stack (update with your values):${NC}"
echo -e "   ${GREEN}pulumi config set gcp:project ${PROJECT_ID}${NC}"
echo -e "   ${GREEN}pulumi config set gcp:region ${REGION}${NC}"
echo -e "   ${GREEN}pulumi config set mock-mock:environment ${ENVIRONMENT}${NC}"
echo -e "   ${GREEN}pulumi config set mock-mock:serviceAccountJsonPath ../secrets/firebase-${ENVIRONMENT}.json${NC}"
echo ""
echo -e "${YELLOW}6. Preview deployment:${NC}"
echo -e "   ${GREEN}pulumi preview${NC}"
echo ""
echo -e "${YELLOW}7. Deploy infrastructure:${NC}"
echo -e "   ${GREEN}pulumi up${NC}"
echo ""
echo -e "${BLUE}For more info, see: infra/README.md${NC}"
echo ""
