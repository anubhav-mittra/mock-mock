import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as fs from "fs";
import * as path from "path";

export interface SecretManagerArgs {
    environment: pulumi.Input<string>;
    projectId: pulumi.Input<string>;
    serviceAccountJsonPath?: string;
}

export class SecretManager extends pulumi.ComponentResource {
    public readonly firebaseSecret: gcp.secretmanager.Secret;
    public readonly firebaseSecretVersion: gcp.secretmanager.SecretVersion;
    public readonly secretName: pulumi.Output<string>;

    constructor(name: string, args: SecretManagerArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:gcp:SecretManager", name, {}, opts);

        const defaultOpts = { parent: this };

        // Create secret for Firebase service account
        this.firebaseSecret = new gcp.secretmanager.Secret(
            `${name}-firebase-sa`,
            {
                secretId: pulumi.interpolate`firebase-service-account-${args.environment}`,
                replication: {
                    auto: {},
                },
                labels: {
                    environment: pulumi.interpolate`${args.environment}`,
                    app: "mock-mock",
                    "managed-by": "pulumi",
                },
            },
            defaultOpts
        );

        // Add secret version with Firebase service account JSON
        // If path provided, read the file; otherwise, create placeholder
        let secretData = pulumi.output("");
        
        if (args.serviceAccountJsonPath) {
            const resolvedPath = path.resolve(args.serviceAccountJsonPath);
            if (fs.existsSync(resolvedPath)) {
                const serviceAccountData = fs.readFileSync(resolvedPath, "utf8");
                secretData = pulumi.output(serviceAccountData);
            } else {
                pulumi.log.warn(
                    `Service account file not found at ${resolvedPath}. Creating placeholder secret.`
                );
                secretData = pulumi.output(JSON.stringify({
                    type: "service_account",
                    project_id: "REPLACE_ME",
                    private_key_id: "REPLACE_ME",
                    private_key: "REPLACE_ME",
                    client_email: "REPLACE_ME",
                    client_id: "REPLACE_ME",
                    auth_uri: "https://accounts.google.com/o/oauth2/auth",
                    token_uri: "https://oauth2.googleapis.com/token",
                    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                    client_x509_cert_url: "REPLACE_ME",
                }));
            }
        } else {
            // Create placeholder - user must update manually
            pulumi.log.info(
                "No service account JSON path provided. Creating placeholder secret. " +
                "Update the secret manually using: gcloud secrets versions add <secret-name> --data-file=<path>"
            );
            secretData = pulumi.output(JSON.stringify({
                type: "service_account",
                project_id: "REPLACE_ME",
                // Add placeholder values
            }));
        }

        this.firebaseSecretVersion = new gcp.secretmanager.SecretVersion(
            `${name}-firebase-sa-version`,
            {
                secret: this.firebaseSecret.id,
                secretData: secretData,
            },
            { ...defaultOpts, dependsOn: [this.firebaseSecret] }
        );

        this.secretName = this.firebaseSecret.name;

        this.registerOutputs({
            firebaseSecret: this.firebaseSecret,
            firebaseSecretVersion: this.firebaseSecretVersion,
            secretName: this.secretName,
        });
    }
}

export function createSecretManager(
    environment: pulumi.Input<string>,
    projectId: pulumi.Input<string>,
    serviceAccountJsonPath?: string
): SecretManager {
    return new SecretManager("secrets", {
        environment,
        projectId,
        serviceAccountJsonPath,
    });
}
