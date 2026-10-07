import type { PayloadKind } from "./PayloadKind.ts";

/**
 * A payload that lives in memory owned outside the JS heap (e.g. a
 * Rust-allocated buffer). `release()` must be called once nothing needs the
 * buffer - ownership/lifetime is explicit rather than GC'd, since JS code
 * cannot safely retain a raw pointer past the point its owner frees it.
 */
export interface NativePayload {
  readonly kind: PayloadKind.Native;
  /**
   * The memory domain, i.e. who can dereference `ptr`: `"host"` (the default)
   * means any CPU code in the process; a device domain such as `"cuda:0"`
   * means only that device's code. Memory registration (e.g. RDMA) is not a
   * domain - see `descriptor.registrations`.
   */
  readonly domain: string;
  readonly ptr: number;
  readonly length: number;
  /**
   * Per-consumer annotations. `registrations` holds memory registrations
   * keyed by the registrar's id (e.g. `"fabric:verbs;mlx5_0"`).
   */
  readonly descriptor?: { readonly registrations?: Readonly<Record<string, unknown>> };
  release(): void;
}

/** The default {@link NativePayload.domain}: memory addressable by any CPU code in the process. */
export const HOST_DOMAIN = "host";
