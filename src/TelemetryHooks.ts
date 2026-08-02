/**
 * Global telemetry hooks supplied once at framework initialisation. Every
 * operation is given a correlation ID and reports through the same hooks,
 * tagged with that ID/operation-type. Callers don't need to thread a
 * callback through every call, but can still track individual operations
 * via the ID in emitted events.
 */
export interface TelemetryHooks {
  onProgress?(event: {
    operationId: string;
    type: string;
    bytesProcessed: number;
    totalBytes?: number;
  }): void;
  onMetric?(event: { name: string; value: number; tags?: Record<string, string> }): void;
}
