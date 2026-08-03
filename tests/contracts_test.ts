import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  ChunkKind,
  type IOProvider,
  type IOProviderFactory,
  type JsChunk,
  PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT,
  fromWebReadableStream,
  toWebReadableStream,
} from "../index.ts";

const exampleConfigSchema = z.object({ rootPath: z.string() });
const examplePropertySchema = z.object({ etag: z.string().optional() });

function createExampleProvider(
  _config: z.infer<typeof exampleConfigSchema>,
): IOProvider<ChunkKind.Js> {
  const store = new Map<string, Uint8Array>();
  return {
    kind: ChunkKind.Js,
    async [Symbol.asyncDispose]() {},
    async *list() {
      for (const path of store.keys()) {
        yield {
          path,
          properties: {
            size: store.get(path)?.length,
            lastModified: undefined,
            isFolder: false,
            properties: {},
          },
        };
      }
    },
    async getProperties(path: string) {
      const data = store.get(path);
      return { size: data?.length, lastModified: undefined, isFolder: false, properties: {} };
    },
    async setProperties() {},
    async delete(path: string) {
      store.delete(path);
    },
    async getReadableStream(path: string) {
      const data = store.get(path) ?? new Uint8Array();
      return {
        kind: ChunkKind.Js,
        stream: new ReadableStream<JsChunk>({
          start(controller) {
            controller.enqueue({ kind: ChunkKind.Js, data });
            controller.close();
          },
        }),
      };
    },
    async getWritableStream(path: string) {
      const chunks: Uint8Array[] = [];
      return {
        kind: ChunkKind.Js,
        stream: new WritableStream<JsChunk>({
          write(chunk) {
            chunks.push(chunk.data);
          },
          close() {
            store.set(path, Buffer.concat(chunks));
          },
        }),
      };
    },
    getMultipartReader: async function* () {},
    getMultipartWriter() {
      return { write: async () => {} };
    },
  };
}

const exampleFactory: IOProviderFactory<z.infer<typeof exampleConfigSchema>, ChunkKind.Js> = {
  configSchema: exampleConfigSchema,
  propertySchema: examplePropertySchema,
  async createProvider(config) {
    return createExampleProvider(exampleConfigSchema.parse(config));
  },
};

describe("IOProviderFactory contract", () => {
  test("extension point constant is a namespaced string", () => {
    expect(PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT).toContain(
      "pluggable-io-framework",
    );
  });

  test("example factory validates config and round-trips a write/read", async () => {
    const provider = await exampleFactory.createProvider({ rootPath: "/tmp" });
    const writable = await provider.getWritableStream("hello.txt");
    const writer = (writable.stream as WritableStream<JsChunk>).getWriter();
    await writer.write({ kind: ChunkKind.Js, data: new TextEncoder().encode("hello") });
    await writer.close();

    const readable = await provider.getReadableStream("hello.txt");
    const reader = (readable.stream as ReadableStream<JsChunk>).getReader();
    const { value } = await reader.read();
    expect(value?.kind).toBe(ChunkKind.Js);
    expect(new TextDecoder().decode(value?.data)).toBe("hello");

    await provider[Symbol.asyncDispose]();
  });

  test("createProvider rejects invalid config", async () => {
    let threw = false;
    try {
      await exampleFactory.createProvider({} as never);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
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
    const webStream = toWebReadableStream(fromWebReadableStream(source));
    const reader = webStream.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe("abc");
  });
});
