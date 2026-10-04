/**
 * Properties of a stored entry (file, object, resource) or container.
 * `size`, `lastModified`, `isContainer` and `contentType` are well-known,
 * framework-guaranteed fields every provider must populate. Anything
 * provider-specific (etag, storage class, custom tags) goes in `properties`,
 * validated against that provider's `propertySchema`.
 */
export interface EntryProperties {
  readonly size: number | undefined;
  readonly lastModified: Date | undefined;
  readonly isContainer: boolean;
  readonly contentType?: string;
  readonly properties: Readonly<Record<string, unknown>>;
}

/**
 * The changes accepted by `IOProvider.setProperties`. `lastModified` and
 * `contentType` are framework-level fields with the same shape for every
 * provider; `properties` is validated per provider against the factory's
 * `settablePropertySchema`. `size` and `isContainer` are never settable.
 */
export interface EntryPropertyChanges {
  readonly lastModified?: Date;
  readonly contentType?: string;
  readonly properties?: Partial<Record<string, unknown>>;
}
