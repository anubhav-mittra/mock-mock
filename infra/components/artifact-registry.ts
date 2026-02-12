import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface ArtifactRegistryArgs {
    region: pulumi.Input<string>;
    environment: pulumi.Input<string>;
    projectId: pulumi.Input<string>;
}

export class ArtifactRegistry extends pulumi.ComponentResource {
    public readonly repository: gcp.artifactregistry.Repository;
    public readonly repositoryUrl: pulumi.Output<string>;

    constructor(name: string, args: ArtifactRegistryArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:gcp:ArtifactRegistry", name, {}, opts);

        const defaultOpts = { parent: this };

        // Create Artifact Registry repository
        this.repository = new gcp.artifactregistry.Repository(
            `${name}-repo`,
            {
                repositoryId: "mock-mock-images",
                location: args.region,
                description: "Docker images for Mock-Mock API Server",
                format: "DOCKER",
                labels: {
                    environment: pulumi.interpolate`${args.environment}`,
                    app: "mock-mock",
                    "managed-by": "pulumi",
                },
                cleanupPolicies: [
                    {
                        id: "keep-minimum-versions",
                        action: "KEEP",
                        mostRecentVersions: {
                            keepCount: 10,
                        },
                    },
                    {
                        id: "delete-old-versions",
                        action: "DELETE",
                        condition: {
                            olderThan: "2592000s", // 30 days
                        },
                    },
                ],
            },
            defaultOpts
        );

        // Build repository URL
        this.repositoryUrl = pulumi.interpolate`${args.region}-docker.pkg.dev/${args.projectId}/mock-mock-images`;

        this.registerOutputs({
            repository: this.repository,
            repositoryUrl: this.repositoryUrl,
        });
    }
}

export function createArtifactRegistry(
    region: pulumi.Input<string>,
    environment: pulumi.Input<string>,
    projectId: pulumi.Input<string>
): ArtifactRegistry {
    return new ArtifactRegistry("artifact-registry", {
        region,
        environment,
        projectId,
    });
}
