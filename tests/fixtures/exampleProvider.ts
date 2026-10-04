import { z } from "zod";
import {
  BYTES_PAYLOAD_TYPE,
  type EntryProperties,
  type IOProvider,
  type IOProviderFactory,
  type Item,
  type LocationTarget,
  PayloadKind,
  type ProviderContext,
  type ResumableWritable,
  type ResumeToken,
  type StreamHandle,
} from "../../index.ts";

const exampleConfigSchema = z.object({ bucket: z.string() });
export const exampleLocationSchema = z.object({
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

export function entryProperties(entry: StoredEntry | undefined): EntryProperties {
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

export const exampleFactory: IOProviderFactory<ExampleConfig, PayloadKind.Js, ExampleLocation> = {
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

export const exampleContext: ProviderContext = {
  resolver: {
    async createProviderForLocation(location) {
      const parsed = exampleLocationSchema.parse(exampleFactory.parseLocationString(location));
      const { config, target } = exampleFactory.toProviderInputs(parsed);
      return { provider: await exampleFactory.createProvider(config, exampleContext), target };
    },
  },
};

export async function writeEntry(provider: IOProvider<PayloadKind.Js>, path: string, text: string) {
  const writable = await provider.getWritableStream(path);
  const writer = (writable.stream as WritableStream<Item<PayloadKind.Js>>).getWriter();
  await writer.write({ payload: { kind: PayloadKind.Js, data: new TextEncoder().encode(text) } });
  await writer.close();
}
