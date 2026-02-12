import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface MonitoringArgs {
    environment: pulumi.Input<string>;
    projectId: pulumi.Input<string>;
    serviceName: pulumi.Input<string>;
    region: pulumi.Input<string>;
    notificationEmail?: string;
}

export class Monitoring extends pulumi.ComponentResource {
    public readonly errorRateAlert?: gcp.monitoring.AlertPolicy;
    public readonly latencyAlert?: gcp.monitoring.AlertPolicy;
    public readonly uptimeAlert?: gcp.monitoring.AlertPolicy;
    public readonly dashboard?: gcp.monitoring.Dashboard;

    constructor(name: string, args: MonitoringArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:gcp:Monitoring", name, {}, opts);

        const defaultOpts = { parent: this };

        // Only create alerts for production environment
        const isProd = pulumi.output(args.environment).apply(env => env === "prod");

        // Create notification channel if email provided
        let notificationChannel: gcp.monitoring.NotificationChannel | undefined;
        if (args.notificationEmail) {
            notificationChannel = new gcp.monitoring.NotificationChannel(
                `${name}-email-channel`,
                {
                    displayName: "Mock-Mock Email Notifications",
                    type: "email",
                    labels: {
                        email_address: args.notificationEmail,
                    },
                    enabled: true,
                },
                defaultOpts
            );
        }

        // Alert for high error rate (5xx responses)
        this.errorRateAlert = new gcp.monitoring.AlertPolicy(
            `${name}-error-rate-alert`,
            {
                displayName: pulumi.interpolate`Mock-Mock ${args.environment} - High Error Rate`,
                documentation: {
                    content: "Error rate exceeded 5% threshold. Check Cloud Logging for details.",
                },
                combiner: "OR",
                conditions: [{
                    displayName: "Error rate > 5%",
                    conditionThreshold: {
                        filter: pulumi.interpolate`resource.type="cloud_run_revision" AND resource.labels.service_name="${args.serviceName}" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"`,
                        aggregations: [{
                            alignmentPeriod: "300s",
                            perSeriesAligner: "ALIGN_RATE",
                            crossSeriesReducer: "REDUCE_SUM",
                            groupByFields: ["resource.service_name"],
                        }],
                        comparison: "COMPARISON_GT",
                        duration: "60s",
                        thresholdValue: 0.05,
                    },
                }],
                notificationChannels: notificationChannel ? [notificationChannel.id] : [],
                alertStrategy: {
                    autoClose: "1800s",
                },
                enabled: isProd,
            },
            defaultOpts
        );

        // Alert for high latency (p95 > 2s)
        this.latencyAlert = new gcp.monitoring.AlertPolicy(
            `${name}-latency-alert`,
            {
                displayName: pulumi.interpolate`Mock-Mock ${args.environment} - High Latency`,
                documentation: {
                    content: "P95 latency exceeded 2 seconds. Service may be overloaded.",
                },
                combiner: "OR",
                conditions: [{
                    displayName: "P95 Latency > 2s",
                    conditionThreshold: {
                        filter: pulumi.interpolate`resource.type="cloud_run_revision" AND resource.labels.service_name="${args.serviceName}" AND metric.type="run.googleapis.com/request_latencies"`,
                        aggregations: [{
                            alignmentPeriod: "300s",
                            perSeriesAligner: "ALIGN_DELTA",
                            crossSeriesReducer: "REDUCE_PERCENTILE_95",
                            groupByFields: ["resource.service_name"],
                        }],
                        comparison: "COMPARISON_GT",
                        duration: "60s",
                        thresholdValue: 2000, // 2000ms = 2s
                    },
                }],
                notificationChannels: notificationChannel ? [notificationChannel.id] : [],
                alertStrategy: {
                    autoClose: "1800s",
                },
                enabled: isProd,
            },
            defaultOpts
        );

        // Create monitoring dashboard
        this.dashboard = new gcp.monitoring.Dashboard(
            `${name}-dashboard`,
            {
                dashboardJson: pulumi.all([args.serviceName, args.environment]).apply(([svc, env]) =>
                    JSON.stringify({
                        displayName: `Mock-Mock ${env} - Metrics Dashboard`,
                        mosaicLayout: {
                            columns: 12,
                            tiles: [
                                {
                                    width: 6,
                                    height: 4,
                                    widget: {
                                        title: "Request Count",
                                        xyChart: {
                                            dataSets: [{
                                                timeSeriesQuery: {
                                                    timeSeriesFilter: {
                                                        filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${svc}" AND metric.type="run.googleapis.com/request_count"`,
                                                        aggregation: {
                                                            alignmentPeriod: "60s",
                                                            perSeriesAligner: "ALIGN_RATE",
                                                            crossSeriesReducer: "REDUCE_SUM",
                                                            groupByFields: ["metric.response_code_class"],
                                                        },
                                                    },
                                                },
                                                plotType: "LINE",
                                            }],
                                            yAxis: {
                                                label: "Requests/sec",
                                                scale: "LINEAR",
                                            },
                                        },
                                    },
                                },
                                {
                                    xPos: 6,
                                    width: 6,
                                    height: 4,
                                    widget: {
                                        title: "Request Latency (P50, P95, P99)",
                                        xyChart: {
                                            dataSets: [
                                                {
                                                    timeSeriesQuery: {
                                                        timeSeriesFilter: {
                                                            filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${svc}" AND metric.type="run.googleapis.com/request_latencies"`,
                                                            aggregation: {
                                                                alignmentPeriod: "60s",
                                                                perSeriesAligner: "ALIGN_DELTA",
                                                                crossSeriesReducer: "REDUCE_PERCENTILE_50",
                                                            },
                                                        },
                                                    },
                                                    plotType: "LINE",
                                                    legendTemplate: "P50",
                                                },
                                                {
                                                    timeSeriesQuery: {
                                                        timeSeriesFilter: {
                                                            filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${svc}" AND metric.type="run.googleapis.com/request_latencies"`,
                                                            aggregation: {
                                                                alignmentPeriod: "60s",
                                                                perSeriesAligner: "ALIGN_DELTA",
                                                                crossSeriesReducer: "REDUCE_PERCENTILE_95",
                                                            },
                                                        },
                                                    },
                                                    plotType: "LINE",
                                                    legendTemplate: "P95",
                                                },
                                                {
                                                    timeSeriesQuery: {
                                                        timeSeriesFilter: {
                                                            filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${svc}" AND metric.type="run.googleapis.com/request_latencies"`,
                                                            aggregation: {
                                                                alignmentPeriod: "60s",
                                                                perSeriesAligner: "ALIGN_DELTA",
                                                                crossSeriesReducer: "REDUCE_PERCENTILE_99",
                                                            },
                                                        },
                                                    },
                                                    plotType: "LINE",
                                                    legendTemplate: "P99",
                                                },
                                            ],
                                            yAxis: {
                                                label: "Latency (ms)",
                                                scale: "LINEAR",
                                            },
                                        },
                                    },
                                },
                                {
                                    yPos: 4,
                                    width: 6,
                                    height: 4,
                                    widget: {
                                        title: "Container Instance Count",
                                        xyChart: {
                                            dataSets: [{
                                                timeSeriesQuery: {
                                                    timeSeriesFilter: {
                                                        filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${svc}" AND metric.type="run.googleapis.com/container/instance_count"`,
                                                        aggregation: {
                                                            alignmentPeriod: "60s",
                                                            perSeriesAligner: "ALIGN_MAX",
                                                            crossSeriesReducer: "REDUCE_SUM",
                                                        },
                                                    },
                                                },
                                                plotType: "LINE",
                                            }],
                                            yAxis: {
                                                label: "Instances",
                                                scale: "LINEAR",
                                            },
                                        },
                                    },
                                },
                                {
                                    xPos: 6,
                                    yPos: 4,
                                    width: 6,
                                    height: 4,
                                    widget: {
                                        title: "Memory Utilization",
                                        xyChart: {
                                            dataSets: [{
                                                timeSeriesQuery: {
                                                    timeSeriesFilter: {
                                                        filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${svc}" AND metric.type="run.googleapis.com/container/memory/utilizations"`,
                                                        aggregation: {
                                                            alignmentPeriod: "60s",
                                                            perSeriesAligner: "ALIGN_MEAN",
                                                            crossSeriesReducer: "REDUCE_MEAN",
                                                        },
                                                    },
                                                },
                                                plotType: "LINE",
                                            }],
                                            yAxis: {
                                                label: "Utilization",
                                                scale: "LINEAR",
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    })
                ),
            },
            defaultOpts
        );

        this.registerOutputs({
            errorRateAlert: this.errorRateAlert,
            latencyAlert: this.latencyAlert,
            uptimeAlert: this.uptimeAlert,
            dashboard: this.dashboard,
        });
    }
}

export function createMonitoring(
    environment: pulumi.Input<string>,
    projectId: pulumi.Input<string>,
    serviceName: pulumi.Input<string>,
    region: pulumi.Input<string>,
    notificationEmail?: string
): Monitoring {
    return new Monitoring("monitoring", {
        environment,
        projectId,
        serviceName,
        region,
        notificationEmail,
    });
}
