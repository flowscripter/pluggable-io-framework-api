import { describe, expect, test } from "bun:test";
import type { TelemetryHooks } from "../index.ts";

describe("TelemetryHooks", () => {
  test("onGap reports reconnects and progress uses entry counts", () => {
    const events: unknown[] = [];
    const hooks: TelemetryHooks = {
      onProgress: (event) => events.push(event.entriesProcessed),
      onGap: (operationId, event) => events.push([operationId, event.atBytes, event.attempt]),
    };
    hooks.onProgress?.({
      operationId: "op",
      type: "copy",
      bytesProcessed: 0,
      entriesProcessed: 1,
      totalEntries: 2,
    });
    hooks.onGap?.("op", { atBytes: 10, attempt: 1 });
    expect(events).toEqual([1, ["op", 10, 1]]);
  });
});
