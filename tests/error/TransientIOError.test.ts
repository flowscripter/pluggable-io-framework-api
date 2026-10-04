import { describe, expect, test } from "bun:test";
import { PermanentIOError, TransientIOError } from "../../index.ts";

describe("TransientIOError", () => {
  test("TransientIOError is an Error with the expected name", () => {
    const error = new TransientIOError("timed out");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("TransientIOError");
    expect(error.message).toBe("timed out");
  });

  test("TransientIOError and PermanentIOError are distinct types", () => {
    const error = new TransientIOError("x");
    expect(error).not.toBeInstanceOf(PermanentIOError);
  });

  test("supports wrapping a cause", () => {
    const cause = new Error("ECONNRESET");
    const error = new TransientIOError("network error", { cause });
    expect(error.cause).toBe(cause);
  });
});
