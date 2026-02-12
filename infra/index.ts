import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { createArtifactRegistry } from "./components/artifact-registry";
import { createFirestore } from "./components/firestore";
import { createSecretManager } from "./components/secrets";
import { createIAM } from "./components/iam";
import { createCloudRun } from "./components/cloud-run";
import { createMonitoring } from "./components/monitoring";

// Load configuration
const config = new pulumi.Config("mock-mock");
const gcpConfig = new pulumi.Config("gcp");

const projectId = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";
const environment = config.require("environment");
const appVersion = config.get("appVersion") || pulumi.getStack();
const minInstances = config.getNumber("minInstances") || 0;
const maxInstances = config.getNumber("maxInstances") || 10;
const memory = config.get("memory") || "512Mi";
const cpu = config.get("cpu") || "1";
const useMinimalImage = config.getBoolean("useMinimalImage") || false;
const firestoreRegion = config.get("firestoreRegion") || region;
const allowUnauthenticated = config.getBoolean("allowUnauthenticated") ?? true;
const corsOrigins = config.get("corsOrigins") || "*";
const domainMapping = config.get("domainMapping") || "";
const notificationEmail = config.get("notificationEmail");
const serviceAccountJsonPath = config.get("serviceAccountJsonPath");

// Enable required GCP APIs
const enabledServices = [
    "run.googleapis.com",
    "firestore.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
].map(
    (service, index) =>
        new gcp.projects.Service(`enable-${service.split(".")[0]}`, {
            project: projectId,
            service: service,
            disableOnDestroy: false,
        })
);

// Wait for APIs to be enabled before creating resources
const apiDependency = { dependsOn: enabledServices };

// 1. Create Artifact Registry
const artifactRegistry = createArtifactRegistry(region, environment, projectId);

// 2. Create Firestore database
const firestore = createFirestore(firestoreRegion, environment, projectId);

// 3. Create Secret Manager for Firebase credentials
const secrets = createSecretManager(environment, projectId, serviceAccountJsonPath);

// 4. Create IAM service account and roles
const iam = createIAM(
    environment,
    projectId,
    secrets.secretName,
    artifactRegistry.repositoryUrl
);

// 5. Deploy Cloud Run service
const cloudRun = createCloudRun({
    environment,
    projectId,
    region,
    repositoryUrl: artifactRegistry.repositoryUrl,
    appVersion,
    useMinimalImage,
    serviceAccountEmail: iam.serviceAccountEmail,
    secretName: secrets.secretName,
    corsOrigins,
    minInstances,
    maxInstances,
    memory,
    cpu,
    allowUnauthenticated,
    domainMapping: domainMapping || undefined,
});

// 6. Set up monitoring and alerts
const monitoring = createMonitoring(
    environment,
    projectId,
    cloudRun.service.name,
    region,
    notificationEmail
);

// Export important values
export const serviceUrl = cloudRun.serviceUrl;
export const imageRef = cloudRun.image.ref;
export const serviceAccountEmail = iam.serviceAccountEmail;
export const repositoryUrl = artifactRegistry.repositoryUrl;
export const firestoreDatabaseId = firestore.databaseId;
export const secretName = secrets.secretName;
export const dashboardUrl = monitoring.dashboard?.id.apply(
    id => `https://console.cloud.google.com/monitoring/dashboards/custom/${id}?project=${projectId}`
);

// Output deployment summary
pulumi.log.info(`
╔════════════════════════════════════════════════════════════════╗
║              Mock-Mock Deployment Summary                      ║
╠════════════════════════════════════════════════════════════════╣
║ Environment:      ${environment}
║ Project:          ${projectId}
║ Region:           ${region}
║ Service URL:      ${cloudRun.serviceUrl.apply(url => url || "Pending...")}
║ Image:            ${cloudRun.image.ref.apply(ref => ref || "Building...")}
║ Min Instances:    ${minInstances}
║ Max Instances:    ${maxInstances}
║ Memory:           ${memory}
║ CPU:              ${cpu}
║ Firestore:        Enabled in ${firestoreRegion}
║ Monitoring:       ${environment === "prod" ? "Enabled with alerts" : "Enabled (no alerts)"}
╚════════════════════════════════════════════════════════════════╝
`);
