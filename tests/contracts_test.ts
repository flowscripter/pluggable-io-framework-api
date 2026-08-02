import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  type ChunkRef,
  type IOProvider,
  type IOProviderFactory,
  PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT,
  fromWebReadableStream,
  toWebReadableStream,
} from "../index.ts";

const exampleConfigSchema = z.object({ rootPath: z.string() });
const examplePropertySchema = z.object({ etag: z.string().optional() });

function createExampleProvider(_config: z.infer<typeof exampleConfigSchema>): IOProvider {
  const store = new Map<string, Uint8Array>();
  return {
    async dispose() {},
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
        stream: new ReadableStream<ChunkRef>({
          start(controller) {
            controller.enqueue({ kind: "js", data });
            controller.close();
          },
        }),
      };
    },
    async getWritableStream(path: string) {
      const chunks: Uint8Array[] = [];
      return {
        stream: new WritableStream<ChunkRef>({
          write(chunk) {
            if (chunk.kind === "js") chunks.push(chunk.data);
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

const exampleFactory: IOProviderFactory<z.infer<typeof exampleConfigSchema>> = {
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
    const writer = (writable.stream as WritableStream<ChunkRef>).getWriter();
    await writer.write({ kind: "js", data: new TextEncoder().encode("hello") });
    await writer.close();

    const readable = await provider.getReadableStream("hello.txt");
    const reader = (readable.stream as ReadableStream<ChunkRef>).getReader();
    const { value } = await reader.read();
    expect(value?.kind).toBe("js");
    expect(new TextDecoder().decode((value as { kind: "js"; data: Uint8Array }).data)).toBe(
      "hello",
    );

    await provider.dispose();
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
