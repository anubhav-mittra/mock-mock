import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker-build";

export interface CloudRunArgs {
    environment: pulumi.Input<string>;
    projectId: pulumi.Input<string>;
    region: pulumi.Input<string>;
    repositoryUrl: pulumi.Input<string>;
    appVersion: pulumi.Input<string>;
    useMinimalImage: pulumi.Input<boolean>;
    serviceAccountEmail: pulumi.Input<string>;
    secretName: pulumi.Input<string>;
    corsOrigins: pulumi.Input<string>;
    minInstances: pulumi.Input<number>;
    maxInstances: pulumi.Input<number>;
    memory: pulumi.Input<string>;
    cpu: pulumi.Input<string>;
    allowUnauthenticated: pulumi.Input<boolean>;
    domainMapping?: pulumi.Input<string>;
}

export class CloudRun extends pulumi.ComponentResource {
    public readonly service: gcp.cloudrunv2.Service;
    public readonly serviceUrl: pulumi.Output<string>;
    public readonly image: docker.Image;

    constructor(name: string, args: CloudRunArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:gcp:CloudRun", name, {}, opts);

        const defaultOpts = { parent: this };

        // Build Docker image
        const dockerfilePath = pulumi.interpolate`${args.useMinimalImage}`.apply(minimal =>
            minimal === "true" ? "../Dockerfile.minimal" : "../Dockerfile"
        );

        const imageName = pulumi.interpolate`${args.repositoryUrl}/server:${args.appVersion}`;

        this.image = new docker.Image(
            `${name}-image`,
            {
                push: true,
                tags: [imageName],
                context: {
                    location: "../",
                },
                dockerfile: {
                    location: dockerfilePath,
                },
                platforms: [docker.Platform.Linux_amd64],
            },
            defaultOpts
        );

        // Create Cloud Run service
        this.service = new gcp.cloudrunv2.Service(
            `${name}-service`,
            {
                name: pulumi.interpolate`mock-mock-server-${args.environment}`,
                location: args.region,
                project: args.projectId,
                description: "Mock-Mock API Server - OpenAPI-based mock server",
                ingress: "INGRESS_TRAFFIC_ALL",
                
                template: {
                    serviceAccount: args.serviceAccountEmail,
                    
                    scaling: {
                        minInstanceCount: args.minInstances,
                        maxInstanceCount: args.maxInstances,
                    },
                    
                    containers: [{
                        image: this.image.ref,
                        
                        ports: [{
                            containerPort: 8080,
                            name: "http1",
                        }],
                        
                        envs: [
                            {
                                name: "NODE_ENV",
                                value: args.environment,
                            },
                            {
                                name: "PORT",
                                value: "8080",
                            },
                            {
                                name: "USE_FIRESTORE",
                                value: "true",
                            },
                            {
                                name: "CORS_ORIGINS",
                                value: args.corsOrigins,
                            },
                        ],
                        
                        resources: {
                            limits: {
                                memory: args.memory,
                                cpu: args.cpu,
                            },
                            cpuIdle: true,
                            startupCpuBoost: true,
                        },
                        
                        startupProbe: {
                            httpGet: {
                                path: "/",
                                port: 8080,
                            },
                            initialDelaySeconds: 0,
                            timeoutSeconds: 1,
                            periodSeconds: 3,
                            failureThreshold: 3,
                        },
                        
                        livenessProbe: {
                            httpGet: {
                                path: "/",
                                port: 8080,
                            },
                            initialDelaySeconds: 10,
                            timeoutSeconds: 1,
                            periodSeconds: 10,
                            failureThreshold: 3,
                        },
                        
                        volumeMounts: [{
                            name: "firebase-secret",
                            mountPath: "/app/config",
                        }],
                    }],
                    
                    volumes: [{
                        name: "firebase-secret",
                        secret: {
                            secret: args.secretName,
                            items: [{
                                version: "latest",
                                path: "serviceAccountKey.json",
                                mode: 0o444,
                            }],
                        },
                    }],
                    
                    timeout: "60s",
                    maxInstanceRequestConcurrency: 80,
                },
                
                traffics: [{
                    type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
                    percent: 100,
                }],
                
                labels: {
                    environment: pulumi.interpolate`${args.environment}`,
                    app: "mock-mock",
                    "managed-by": "pulumi",
                },
            },
            { ...defaultOpts, dependsOn: [this.image] }
        );

        // Configure IAM policy for unauthenticated access (if enabled)
        if (args.allowUnauthenticated) {
            const noAuthIamPolicy = new gcp.cloudrunv2.ServiceIamMember(
                `${name}-noauth`,
                {
                    project: args.projectId,
                    location: args.region,
                    name: this.service.name,
                    role: "roles/run.invoker",
                    member: "allUsers",
                },
                { ...defaultOpts, dependsOn: [this.service] }
            );
        }

        this.serviceUrl = this.service.uri;

        this.registerOutputs({
            service: this.service,
            serviceUrl: this.serviceUrl,
            image: this.image,
        });
    }
}

export function createCloudRun(args: CloudRunArgs): CloudRun {
    return new CloudRun("cloud-run", args);
}
