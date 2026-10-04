/**
 * What a parsed location addresses, as returned by
 * `IOProviderFactory.toProviderInputs`. Keys are provider-specific (the
 * factory performs any protocol-specific join of path and filename):
 *
 * - `entry`: a filename was given - a single entry.
 * - `container`: neither filename nor pattern was given - a whole container.
 * - `pattern`: a glob pattern was given - the matching entries in a container.
 */
export type LocationTarget =
  | { readonly kind: "entry"; readonly key: string }
  | { readonly kind: "container"; readonly key: string }
  | { readonly kind: "pattern"; readonly containerKey: string; readonly pattern: string };
