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
    /**
     * Set when this event belongs to a child operation of a larger one -
     * e.g. one multipart part's `operationId`, tagged with the overall
     * transfer's `operationId` as `parentOperationId`, or one recursive-copy
     * entry tagged with the overall container operation. The parent operation
     * continues to emit its own aggregate event stream under its own
     * `operationId` (with no `parentOperationId`) alongside these.
     */
    parentOperationId?: string;
    type: string;
    bytesProcessed: number;
    totalBytes?: number;
    /**
     * Set instead of/alongside bytes for a recursive container operation,
     * where the total byte count isn't knowable without fully buffering the
     * listing first. `totalEntries` grows as the underlying listing continues
     * - it is the best-known-so-far count, not a fixed upfront total.
     */
    entriesProcessed?: number;
    totalEntries?: number;
  }): void;
  /**
   * Reported when an unbounded source is reconnected after a failure.
   * `atBytes` is the number of bytes transferred before the gap; `attempt`
   * is the consecutive reconnect attempt.
   */
  onGap?(operationId: string, event: { atBytes: number; attempt: number }): void;
  onMetric?(event: { name: string; value: number; tags?: Record<string, string> }): void;
}
