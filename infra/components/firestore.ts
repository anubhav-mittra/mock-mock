import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface FirestoreArgs {
    region: pulumi.Input<string>;
    environment: pulumi.Input<string>;
    projectId: pulumi.Input<string>;
}

export class Firestore extends pulumi.ComponentResource {
    public readonly database: gcp.firestore.Database;
    public readonly databaseId: pulumi.Output<string>;

    constructor(name: string, args: FirestoreArgs, opts?: pulumi.ComponentResource Options) {
        super("custom:gcp:Firestore", name, {}, opts);

        const defaultOpts = { parent: this };

        // Create Firestore database (Native mode)
        this.database = new gcp.firestore.Database(
            `${name}-db`,
            {
                project: args.projectId,
                name: "(default)",
                locationId: args.region,
                type: "FIRESTORE_NATIVE",
                concurrencyMode: "OPTIMISTIC",
                appEngineIntegrationMode: "DISABLED",
                pointInTimeRecoveryEnablement: "POINT_IN_TIME_RECOVERY_ENABLED",
                deleteProtectionState: pulumi.interpolate`${args.environment}`.apply(env =>
                    env === "prod" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
                ),
            },
            defaultOpts
        );

        this.databaseId = this.database.name;

        // Create indexes for common queries (optional, add as needed)
        // Example: Index for timestamp queries on mockData collection
        const timestampIndex = new gcp.firestore.Index(
            `${name}-timestamp-index`,
            {
                project: args.projectId,
                database: this.database.name,
                collection: "mockData",
                fields: [
                    {
                        fieldPath: "timestamp",
                        order: "DESCENDING",
                    },
                    {
                        fieldPath: "__name__",
                        order: "DESCENDING",
                    },
                ],
            },
            { ...defaultOpts, dependsOn: [this.database] }
        );

        this.registerOutputs({
            database: this.database,
            databaseId: this.databaseId,
        });
    }
}

export function createFirestore(
    region: pulumi.Input<string>,
    environment: pulumi.Input<string>,
    projectId: pulumi.Input<string>
): Firestore {
    return new Firestore("firestore", {
        region,
        environment,
        projectId,
    });
}
