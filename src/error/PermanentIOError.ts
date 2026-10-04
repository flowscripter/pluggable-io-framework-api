/**
 * Base class for an error that will not succeed on retry (e.g. a validation
 * failure, a missing file, a permissions error). Errors that are neither
 * this nor {@link TransientIOError} are treated as non-retryable by default.
 */
export class PermanentIOError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PermanentIOError";
  }
}
