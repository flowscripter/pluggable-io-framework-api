/**
 * Global telemetry hooks supplied once at framework initialisation. Every
 * operation is given a correlation id and reports through the same hooks,
 * tagged with that id/operation-type - callers don't need to thread a
 * callback through every call, but can still track individual operations
 * via the id in emitted events.
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
