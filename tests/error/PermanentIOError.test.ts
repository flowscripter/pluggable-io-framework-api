import { describe, expect, test } from "bun:test";
import { PermanentIOError } from "../../index.ts";

describe("PermanentIOError", () => {
  test("PermanentIOError is an Error with the expected name", () => {
    const error = new PermanentIOError("not found");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PermanentIOError");
    expect(error.message).toBe("not found");
  });
});
