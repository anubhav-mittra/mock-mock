#!/bin/bash

# Setup Pulumi State Backend in GCS
# This script creates a Google Cloud Storage bucket for storing Pulumi state
# Usage: ./setup-state-backend.sh <project-id> <region>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 2 ]; then
    echo -e "${RED}Error: Invalid number of arguments${NC}"
    echo "Usage: $0 <project-id> <region>"
    echo "Example: $0 my-project-123 us-central1"
    exit 1
fi

PROJECT_ID=$1
REGION=$2
BUCKET_NAME="${PROJECT_ID}-pulumi-state"

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setting up Pulumi State Backend in GCS              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Project ID: ${PROJECT_ID}"
echo "Region:     ${REGION}"
echo "Bucket:     gs://${BUCKET_NAME}"
echo ""

# Set active project
echo -e "${YELLOW}→ Setting active GCP project...${NC}"
gcloud config set project "${PROJECT_ID}"

# Check if bucket already exists
if gsutil ls -b "gs://${BUCKET_NAME}" &> /dev/null; then
    echo -e "${GREEN}✓ Bucket gs://${BUCKET_NAME} already exists${NC}"
else
    # Create GCS bucket for Pulumi state
    echo -e "${YELLOW}→ Creating GCS bucket for Pulumi state...${NC}"
    gsutil mb -p "${PROJECT_ID}" -l "${REGION}" "gs://${BUCKET_NAME}"
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# Enable versioning
echo -e "${YELLOW}→ Enabling versioning...${NC}"
gsutil versioning set on "gs://${BUCKET_NAME}"
echo -e "${GREEN}✓ Versioning enabled${NC}"

# Set lifecycle policy to retain 30 versions
echo -e "${YELLOW}→ Setting lifecycle policy...${NC}"
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 30,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json "gs://${BUCKET_NAME}"
rm /tmp/lifecycle.json
echo -e "${GREEN}✓ Lifecycle policy applied (retain 30 versions)${NC}"

# Enable uniform bucket-level access
echo -e "${YELLOW}→ Enabling uniform bucket-level access...${NC}"
gsutil uniformbucketlevelaccess set on "gs://${BUCKET_NAME}"
echo -e "${GREEN}✓ Uniform bucket-level access enabled${NC}"

# Get current user email
USER_EMAIL=$(gcloud config get-value account)

# Grant storage.objectAdmin to current user
echo -e "${YELLOW}→ Granting permissions to ${USER_EMAIL}...${NC}"
gsutil iam ch "user:${USER_EMAIL}:roles/storage.objectAdmin" "gs://${BUCKET_NAME}"
echo -e "${GREEN}✓ Permissions granted${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete!                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Login to Pulumi with GCS backend:"
echo -e "   ${GREEN}pulumi login gs://${BUCKET_NAME}${NC}"
echo ""
echo "2. Initialize your Pulumi stack:"
echo -e "   ${GREEN}cd infra && pulumi stack init <env>${NC}"
echo ""
echo "3. Configure your stack:"
echo -e "   ${GREEN}pulumi config set gcp:project ${PROJECT_ID}${NC}"
echo -e "   ${GREEN}pulumi config set gcp:region ${REGION}${NC}"
echo -e "   ${GREEN}pulumi config set mock-mock:environment <env>${NC}"
echo ""
