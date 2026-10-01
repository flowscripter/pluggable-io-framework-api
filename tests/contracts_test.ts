import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  BYTES_PAYLOAD_TYPE,
  type EntryProperties,
  type IOProvider,
  type IOProviderFactory,
  type Item,
  type LocationTarget,
  PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT,
  PayloadKind,
  type ProviderContext,
  type ResumableWritable,
  type ResumeToken,
  type StreamHandle,
  type TelemetryHooks,
  fromWebReadableStream,
  toWebReadableStream,
} from "../index.ts";

const exampleConfigSchema = z.object({ bucket: z.string() });
const exampleLocationSchema = z.object({
  bucket: z.string(),
  path: z.string(),
  filename: z.string().optional(),
  pattern: z.string().optional(),
  token: z.string().optional().meta({ secret: true }),
});
const examplePropertySchema = z.object({ etag: z.string().optional() });
const exampleSettablePropertySchema = z.object({ tag: z.string().optional() });

type ExampleConfig = z.infer<typeof exampleConfigSchema>;
type ExampleLocation = z.infer<typeof exampleLocationSchema>;

interface StoredEntry {
  data: Uint8Array;
  lastModified?: Date;
  contentType?: string;
  properties: Record<string, unknown>;
}

function entryProperties(entry: StoredEntry | undefined): EntryProperties {
  return {
    size: entry?.data.length,
    lastModified: entry?.lastModified,
    isContainer: false,
    contentType: entry?.contentType,
    properties: entry?.properties ?? {},
  };
}

function createExampleProvider(_config: ExampleConfig): IOProvider<PayloadKind.Js> {
  const store = new Map<string, StoredEntry>();
  return {
    kind: PayloadKind.Js,
    async [Symbol.asyncDispose]() {},
    async *list() {
      for (const [path, entry] of store) {
        yield { path, properties: entryProperties(entry) };
      }
    },
    async getProperties(path: string) {
      return entryProperties(store.get(path));
    },
    async setProperties(path, changes) {
      const entry = store.get(path);
      if (!entry) {
        throw new Error(`no entry at ${path}`);
      }
      const properties = exampleSettablePropertySchema.parse(changes.properties ?? {});
      store.set(path, {
        ...entry,
        lastModified: changes.lastModified ?? entry.lastModified,
        contentType: changes.contentType ?? entry.contentType,
        properties: { ...entry.properties, ...properties },
      });
    },
    async delete(path: string) {
      store.delete(path);
    },
    joinKey(containerKey, name) {
      return `${containerKey}/${name}`;
    },
    async getReadableStream(path: string) {
      const data = store.get(path)?.data ?? new Uint8Array();
      return {
        kind: PayloadKind.Js,
        bounded: true,
        payloadType: BYTES_PAYLOAD_TYPE,
        stream: new ReadableStream<Item<PayloadKind.Js>>({
          start(controller) {
            controller.enqueue({ payload: { kind: PayloadKind.Js, data } });
            controller.close();
          },
        }),
      };
    },
    async getWritableStream(path: string, opts?: { resume?: ResumeToken }) {
      const startOffset = opts?.resume ? (store.get(path)?.data.length ?? 0) : 0;
      const chunks: Uint8Array[] = opts?.resume
        ? [store.get(path)?.data.subarray(0, startOffset) ?? new Uint8Array()]
        : [];
      let committed = startOffset;
      const handle: StreamHandle<PayloadKind.Js> & ResumableWritable & { startOffset: number } = {
        kind: PayloadKind.Js,
        startOffset,
        resumeToken: () => ({ offset: committed, state: { path } }),
        stream: new WritableStream<Item<PayloadKind.Js>>({
          write(item) {
            chunks.push(item.payload.data);
            committed += item.payload.data.length;
            store.set(path, { data: Buffer.concat(chunks), properties: {} });
          },
        }),
      };
      return handle;
    },
  };
}

const exampleFactory: IOProviderFactory<ExampleConfig, PayloadKind.Js, ExampleLocation> = {
  protocol: "example",
  kind: PayloadKind.Js,
  readPayloadTypes: [BYTES_PAYLOAD_TYPE],
  writePayloadTypes: [BYTES_PAYLOAD_TYPE],
  configSchema: exampleConfigSchema,
  locationSchema: exampleLocationSchema,
  propertySchema: examplePropertySchema,
  settablePropertySchema: exampleSettablePropertySchema,
  parseLocationString(location) {
    const url = new URL(location);
    return { bucket: url.host, path: url.pathname.replace(/^\//, "") };
  },
  toProviderInputs(location) {
    const config = { bucket: location.bucket };
    let target: LocationTarget;
    if (location.filename !== undefined) {
      target = { kind: "entry", key: `${location.path}/${location.filename}` };
    } else if (location.pattern !== undefined) {
      target = { kind: "pattern", containerKey: location.path, pattern: location.pattern };
    } else {
      target = { kind: "container", key: location.path };
    }
    return { config, target };
  },
  async createProvider(config, _context) {
    return createExampleProvider(exampleConfigSchema.parse(config));
  },
};

const exampleContext: ProviderContext = {
  resolver: {
    async createProviderForLocation(location) {
      const parsed = exampleLocationSchema.parse(exampleFactory.parseLocationString(location));
      const { config, target } = exampleFactory.toProviderInputs(parsed);
      return { provider: await exampleFactory.createProvider(config, exampleContext), target };
    },
  },
};

async function writeEntry(provider: IOProvider<PayloadKind.Js>, path: string, text: string) {
  const writable = await provider.getWritableStream(path);
  const writer = (writable.stream as WritableStream<Item<PayloadKind.Js>>).getWriter();
  await writer.write({ payload: { kind: PayloadKind.Js, data: new TextEncoder().encode(text) } });
  await writer.close();
}

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

  test("resolver creates a provider and target from a location string", async () => {
    const { provider, target } =
      await exampleContext.resolver.createProviderForLocation("example://bucket/dir");
    expect(target).toEqual({ kind: "container", key: "dir" });
    expect(provider.kind).toBe(PayloadKind.Js);
    await provider[Symbol.asyncDispose]();
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

describe("IOProvider contract", () => {
  test("setProperties applies framework fields and validated provider properties", async () => {
    const provider = await exampleFactory.createProvider({ bucket: "b" }, exampleContext);
    await writeEntry(provider, "a", "x");
    const lastModified = new Date(0);
    await provider.setProperties?.("a", {
      lastModified,
      contentType: "text/plain",
      properties: { tag: "t" },
    });
    const properties = await provider.getProperties("a");
    expect(properties.lastModified).toBe(lastModified);
    expect(properties.contentType).toBe("text/plain");
    expect(properties.isContainer).toBe(false);
    expect(properties.properties).toEqual({ tag: "t" });
    await expect(provider.setProperties?.("a", { properties: { tag: 1 } })).rejects.toThrow();
  });

  test("optional members may be absent", () => {
    const minimal: IOProvider<PayloadKind.Js> = {
      kind: PayloadKind.Js,
      async [Symbol.asyncDispose]() {},
      getProperties: async () => entryProperties(undefined),
      getReadableStream: async () => ({ kind: PayloadKind.Js, stream: new ReadableStream() }),
      getWritableStream: async () => ({ kind: PayloadKind.Js, stream: new WritableStream() }),
    };
    expect(minimal.list).toBeUndefined();
    expect(minimal.delete).toBeUndefined();
    expect(minimal.setProperties).toBeUndefined();
    expect(minimal.createContainer).toBeUndefined();
    expect(minimal.joinKey).toBeUndefined();
    expect(minimal.getMultipartWriter).toBeUndefined();
  });

  test("a writable's resume token reopens the write at the committed offset", async () => {
    const provider = await exampleFactory.createProvider({ bucket: "b" }, exampleContext);
    const first = await provider.getWritableStream("r");
    const writer = (first.stream as WritableStream<Item<PayloadKind.Js>>).getWriter();
    await writer.write({
      payload: { kind: PayloadKind.Js, data: new TextEncoder().encode("abc") },
    });
    const token = (first as unknown as ResumableWritable).resumeToken();
    expect(token).toEqual({ offset: 3, state: { path: "r" } });
    expect(JSON.parse(JSON.stringify(token))).toEqual(token);

    const resumed = await provider.getWritableStream("r", { resume: token });
    expect(resumed.startOffset).toBe(3);
    const resumedWriter = (resumed.stream as WritableStream<Item<PayloadKind.Js>>).getWriter();
    await resumedWriter.write({
      payload: { kind: PayloadKind.Js, data: new TextEncoder().encode("de") },
    });
    expect((await provider.getProperties("r")).size).toBe(5);
  });
});

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

describe("Web Streams interop adapters", () => {
  test("fromWebReadableStream then toWebReadableStream round-trips bytes", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("abc"));
        controller.close();
      },
    });
    const items = fromWebReadableStream(source);
    const webStream = toWebReadableStream(items);
    const reader = webStream.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe("abc");
    expect((await reader.read()).done).toBe(true);
  });

  test("fromWebReadableStream wraps bytes as js payload items", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    const { value } = await fromWebReadableStream(source).getReader().read();
    expect(value).toEqual({ payload: { kind: PayloadKind.Js, data: new Uint8Array([1]) } });
  });
});
