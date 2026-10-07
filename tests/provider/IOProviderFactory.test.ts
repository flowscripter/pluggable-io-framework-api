import { describe, expect, test } from "bun:test";
import {
  BYTES_PAYLOAD_TYPE,
  type Item,
  PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT,
  PayloadKind,
} from "../../index.ts";
import {
  exampleContext,
  exampleFactory,
  exampleLocationSchema,
  writeEntry,
} from "../fixtures/exampleProvider.ts";

describe("IOProviderFactory contract", () => {
  test("extension point constant is a namespaced string", () => {
    expect(PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT).toContain(
      "pluggable-io-framework",
    );
  });

  test("factory declares protocol, kind and payload types before instantiation", () => {
    expect(exampleFactory.protocol).toBe("example");
    expect(exampleFactory.kind).toBe(PayloadKind.Js);
    expect(exampleFactory.domains).toBeUndefined();
    expect(exampleFactory.readPayloadTypes).toEqual(["bytes"]);
    expect(exampleFactory.writePayloadTypes).toEqual(["bytes"]);
  });

  test("locationSchema marks secret fields via meta", () => {
    expect(exampleLocationSchema.shape.token.meta()).toEqual({ secret: true });
  });

  test("location strings map onto each LocationTarget variant", () => {
    const parse = (input: unknown) =>
      exampleFactory.toProviderInputs(exampleLocationSchema.parse(input));
    const raw = exampleFactory.parseLocationString("example://bucket/dir") as object;
    expect(raw).toEqual({ bucket: "bucket", path: "dir" });
    expect(parse(raw)).toEqual({
      config: { bucket: "bucket" },
      target: { kind: "container", key: "dir" },
    });
    expect(parse({ ...raw, filename: "a.txt" }).target).toEqual({
      kind: "entry",
      key: "dir/a.txt",
    });
    expect(parse({ ...raw, pattern: "*.txt" }).target).toEqual({
      kind: "pattern",
      containerKey: "dir",
      pattern: "*.txt",
    });
  });

  test("example factory validates config and round-trips a write/read", async () => {
    const provider = await exampleFactory.createProvider({ bucket: "b" }, exampleContext);
    await writeEntry(provider, "hello.txt", "hello");

    const readable = await provider.getReadableStream("hello.txt");
    expect(readable.bounded).toBe(true);
    expect(readable.payloadType).toBe(BYTES_PAYLOAD_TYPE);
    const reader = (readable.stream as ReadableStream<Item<PayloadKind.Js>>).getReader();
    const { value } = await reader.read();
    expect(value?.payload.kind).toBe(PayloadKind.Js);
    expect(new TextDecoder().decode(value?.payload.data)).toBe("hello");

    await provider[Symbol.asyncDispose]();
  });

  test("createProvider rejects invalid config", async () => {
    await expect(exampleFactory.createProvider({} as never, exampleContext)).rejects.toThrow();
  });
});
