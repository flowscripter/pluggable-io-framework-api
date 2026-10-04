/**
 * Base class for an error that is worth retrying - the same operation might
 * succeed on a subsequent attempt (e.g. a network timeout, a throttling
 * response). Providers should throw/wrap their backend errors in this (or
 * {@link PermanentIOError}) so framework-level retry logic
 * (`withRetry` in `pluggable-io-framework`) can classify them without needing
 * to know about any specific backend's error shapes.
 */
export class TransientIOError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TransientIOError";
  }
}
