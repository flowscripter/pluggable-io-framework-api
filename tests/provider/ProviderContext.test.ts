import { describe, expect, test } from "bun:test";
import { PayloadKind } from "../../index.ts";
import { exampleContext } from "../fixtures/exampleProvider.ts";

describe("ProviderResolver contract", () => {
  test("resolver creates a provider and target from a location string", async () => {
    const { provider, target } =
      await exampleContext.resolver.createProviderForLocation("example://bucket/dir");
    expect(target).toEqual({ kind: "container", key: "dir" });
    expect(provider.kind).toBe(PayloadKind.Js);
    await provider[Symbol.asyncDispose]();
  });
});
