/**
 * Properties of a file/folder item. `size`, `lastModified`, `isFolder` and
 * `contentType` are well-known, framework-guaranteed fields every provider
 * must populate. Anything provider-specific (etag,
 * storage class, custom tags) goes in `properties`, validated against that
 * provider's `propertySchema`.
 */
export interface ItemProperties {
  readonly size: number | undefined;
  readonly lastModified: Date | undefined;
  readonly isFolder: boolean;
  readonly contentType?: string;
  readonly properties: Readonly<Record<string, unknown>>;
}
