# pluggable-io-framework-api

[![version](https://img.shields.io/github/v/release/flowscripter/pluggable-io-framework-api?sort=semver)](https://github.com/flowscripter/pluggable-io-framework-api/releases)
[![build](https://img.shields.io/github/actions/workflow/status/flowscripter/pluggable-io-framework-api/release-bun-library.yml)](https://github.com/flowscripter/pluggable-io-framework-api/actions/workflows/release-bun-library.yml)
[![docs](https://img.shields.io/badge/docs-API-blue)](https://flowscripter.github.io/pluggable-io-framework-api/index.html)
[![license: MIT](https://img.shields.io/github/license/flowscripter/pluggable-io-framework-api)](https://github.com/flowscripter/pluggable-io-framework-api/blob/main/LICENSE)

> API for the https://github.com/flowscripter/pluggable-io-framework

## Key Features

- Defines the `IOProviderFactory`/`IOProvider` contract that source/sink
  plugins (e.g. local filesystem, object storage) implement which are then discovered and
  loaded via
  [dynamic-plugin-framework](https://github.com/flowscripter/dynamic-plugin-framework).
- `IOProvider`, `StreamHandle` and `Part` are tagged with the single
  `ChunkKind` ("js" or "native") a provider natively produces/consumes -
  streams are homogeneous, so consumers never test each chunk's kind. A
  mismatch between two linked streams is decided once per link via
  `adaptReadableStream`, not once per chunk.
- `JsChunk`/`NativeChunk`: a tagged-union stream payload that carries memory
  ownership/origin with it, enabling zero-copy handoff to/from
  Rust-FFI-backed providers and decorators, with a small adapter to the
  standard Web Streams `ReadableStream<Uint8Array>`/`WritableStream<Uint8Array>`
  for interop (`fetch`, `pipeTo`, etc.).
- Capabilities beyond plain streaming (e.g. `seekable`) are modeled as
  small interfaces (`Seekable`, `RangeReadable`) with co-located type guards
  (`isSeekable`, `isRangeReadable`) rather than ad hoc `typeof` checks.
- Well-known item properties (`size`, `lastModified`, `isFolder`,
  `contentType`) are default for every provider.
- A provider-specific
  `properties` extension bag supports other properties (e.g. etag, storage class, custom tags).
- Provider config and per-item property schemas are defined with
  [Zod](https://zod.dev).
- Multipart transfers are modeled as a stream of independently readable/writable
  `Part` handles allowing parts to be processed concurrently.
- A global `TelemetryHooks` object is supplied once at
  initialisation and every operation reports through it tagged with a
  correlation ID.
- Disposal is `Symbol.asyncDispose` (TC39 explicit resource management) -
  `await using provider = await factory.createProvider(config)` disposes
  deterministically, including on thrown errors.
- See
  [pluggable-io-framework](https://github.com/flowscripter/pluggable-io-framework)
  for orchestration and
  [pluggable-io-framework-plugin-filesystem](https://github.com/flowscripter/pluggable-io-framework-plugin-filesystem)
  for a reference implementation.

## Development

Install dependencies:

`bun install`

Build (produces `dist/` for Node.js and TypeScript consumers; Bun uses raw source directly):

`bun run build`

Test:

`bun test`

Format:

`bunx oxfmt`

Lint:

`bunx oxlint index.ts src/ tests/`

Generate HTML API Documentation:

`bunx typedoc index.ts`

## Documentation

### Overview

```mermaid
classDiagram
    IOProviderFactory --> IOProvider : creates
    IOProvider --> StreamHandle : returns (kind K)
    IOProvider --> Part : returns (multipart, kind K)
    StreamHandle --> JsChunk : streams (kind "js")
    StreamHandle --> NativeChunk : streams (kind "native")
    IOProvider --> ItemProperties : returns

    class IOProviderFactory {
      +configSchema
      +propertySchema
      +createProvider(config)
    }
    class IOProvider {
      +kind: K
      +[Symbol.asyncDispose]()
      +list(path, options)
      +getProperties(path)
      +setProperties(path, properties)
      +delete(path)
      +getReadableStream(path)
      +getWritableStream(path)
      +getMultipartReader(path)
      +getMultipartWriter(path)
      +canDirectTransfer(other)
      +directCopy(sourcePath, destPath)
      +directMove(sourcePath, destPath)
    }
```

### API

Link to auto-generated API docs:

[API Documentation](https://flowscripter.github.io/pluggable-io-framework-api/index.html)

## License

MIT © Flowscripter
