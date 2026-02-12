import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface IAMArgs {
    environment: pulumi.Input<string>;
    projectId: pulumi.Input<string>;
    secretName: pulumi.Input<string>;
    repositoryUrl: pulumi.Input<string>;
}

export class IAM extends pulumi.ComponentResource {
    public readonly serviceAccount: gcp.serviceaccount.Account;
    public readonly serviceAccountEmail: pulumi.Output<string>;

    constructor(name: string, args: IAMArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:gcp:IAM", name, {}, opts);

        const defaultOpts = { parent: this };

        // Create service account for Cloud Run
        this.serviceAccount = new gcp.serviceaccount.Account(
            `${name}-sa`,
            {
                accountId: pulumi.interpolate`mock-mock-${args.environment}`,
                displayName: pulumi.interpolate`Mock-Mock Server ${args.environment}`,
                description: "Service account for Mock-Mock API Server Cloud Run service",
                project: args.projectId,
            },
            defaultOpts
        );

        this.serviceAccountEmail = this.serviceAccount.email;

        // Grant Firestore access
        const firestoreRole = new gcp.projects.IAMMember(
            `${name}-firestore-role`,
            {
                project: args.projectId,
                role: "roles/datastore.user",
                member: pulumi.interpolate`serviceAccount:${this.serviceAccount.email}`,
            },
            defaultOpts
        );

        // Grant Secret Manager access
        const secretAccessorRole = new gcp.secretmanager.SecretIamMember(
            `${name}-secret-accessor`,
            {
                secretId: args.secretName,
                role: "roles/secretmanager.secretAccessor",
                member: pulumi.interpolate`serviceAccount:${this.serviceAccount.email}`,
            },
            defaultOpts
        );

        // Grant Cloud Logging write access
        const loggingRole = new gcp.projects.IAMMember(
            `${name}-logging-role`,
            {
                project: args.projectId,
                role: "roles/logging.logWriter",
                member: pulumi.interpolate`serviceAccount:${this.serviceAccount.email}`,
            },
            defaultOpts
        );

        // Grant Cloud Trace access for distributed tracing
        const traceRole = new gcp.projects.IAMMember(
            `${name}-trace-role`,
            {
                project: args.projectId,
                role: "roles/cloudtrace.agent",
                member: pulumi.interpolate`serviceAccount:${this.serviceAccount.email}`,
            },
            defaultOpts
        );

        // Grant Artifact Registry read access
        const artifactRegistryRegion = args.repositoryUrl.apply(url => url.split("-docker.pkg.dev")[0]);
        const artifactRegistryRole = new gcp.projects.IAMMember(
            `${name}-artifact-registry-reader`,
            {
                project: args.projectId,
                role: "roles/artifactregistry.reader",
                member: pulumi.interpolate`serviceAccount:${this.serviceAccount.email}`,
            },
            defaultOpts
        );

        this.registerOutputs({
            serviceAccount: this.serviceAccount,
            serviceAccountEmail: this.serviceAccountEmail,
        });
    }
}

export function createIAM(
    environment: pulumi.Input<string>,
    projectId: pulumi.Input<string>,
    secretName: pulumi.Input<string>,
    repositoryUrl: pulumi.Input<string>
): IAM {
    return new IAM("iam", {
        environment,
        projectId,
        secretName,
        repositoryUrl,
    });
}
