import type { ItemProperties } from "./ItemProperties.ts";
import type { Part } from "./Part.ts";
import type { StreamHandle } from "./StreamHandle.ts";

/**
 * A configured source/sink instance, as returned by
 * {@link IOProviderFactory.createProvider}.
 *
 * Disposal is the explicit {@link IOProvider.dispose} method - not a reliance
 * on `Symbol.asyncDispose` - so plugins have an unambiguous, discoverable
 * contract for releasing connections/handles.
 */
export interface IOProvider {
  dispose(): Promise<void>;

  list(
    path: string,
    options?: { recursive?: boolean; regex?: RegExp },
  ): AsyncIterable<{ path: string; properties: ItemProperties }>;
  getProperties(path: string): Promise<ItemProperties>;
  setProperties(path: string, properties: Partial<Record<string, unknown>>): Promise<void>;
  delete(path: string): Promise<void>;

  getReadableStream(path: string): Promise<StreamHandle>;
  getWritableStream(path: string): Promise<StreamHandle>;
  getMultipartReader(path: string): AsyncIterable<Part>;
  getMultipartWriter(path: string): { write(parts: AsyncIterable<Part>): Promise<void> };

  /**
   * Self-reported direct-transfer eligibility - the provider owns what
   * "same" means for its backend (e.g. same mount for filesystem, same
   * bucket+region+credentials for object storage).
   */
  canDirectTransfer?(other: IOProvider): boolean;
  directCopy?(sourcePath: string, destPath: string): Promise<void>;
  directMove?(sourcePath: string, destPath: string): Promise<void>;
}
