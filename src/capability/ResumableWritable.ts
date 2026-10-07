import type { JsonValue } from "../util/JsonValue.ts";

/**
 * Serializable state that lets an interrupted write be resumed via
 * `IOProvider.getWritableStream(path, { resume })` or
 * `IOProvider.getMultipartWriter(path, partSize, { resume })`.
 */
export interface ResumeToken {
  /** Bytes committed (best known). */
  readonly offset: number;
  /** Provider-specific state, e.g. `{ uploadId, parts }` or `{ uploadUrl }`. */
  readonly state?: JsonValue;
}

/**
 * Capability of a writable handle or a `MultipartWriter` that can produce a
 * {@link ResumeToken}.
 */
export interface ResumableWritable {
  /** Must still work after the handle has failed. */
  resumeToken(): ResumeToken | undefined;
}

export function isResumableWritable<T extends object>(writer: T): writer is T & ResumableWritable {
  return typeof (writer as Partial<ResumableWritable>).resumeToken === "function";
}
