# pluggable-io-framework-api

[![version](https://img.shields.io/github/v/release/flowscripter/pluggable-io-framework-api?sort=semver)](https://github.com/flowscripter/pluggable-io-framework-api/releases)
[![build](https://img.shields.io/github/actions/workflow/status/flowscripter/pluggable-io-framework-api/release-bun-library.yml)](https://github.com/flowscripter/pluggable-io-framework-api/actions/workflows/release-bun-library.yml)
[![docs](https://img.shields.io/badge/docs-API-blue)](https://flowscripter.github.io/pluggable-io-framework-api/index.html)
[![license: MIT](https://img.shields.io/github/license/flowscripter/pluggable-io-framework-api)](https://github.com/flowscripter/pluggable-io-framework-api/blob/main/LICENSE)

> API for the [pluggable-io-framework](https://github.com/flowscripter/pluggable-io-framework)

## Usage

Provider plugin authors should depend on this package (not the full
`@flowscripter/pluggable-io-framework`) as a `peerDependency`:

```jsonc
{
  "peerDependencies": {
    "@flowscripter/pluggable-io-framework-api": "*",
  },
}
```

A plugin registers an `IOProviderFactory` (and optionally
`PayloadConverterExtension`s) via
[dynamic-plugin-framework](https://github.com/flowscripter/dynamic-plugin-framework)
using the exported extension point constants.

Key exports:

- `IOProviderFactory` - declares a provider's `protocol`, `PayloadKind`, location/config/property
  Zod schemas, and turns a location into provider config plus a `LocationTarget`.
- `IOProvider` - a configured source/sink: streams, properties, listing and optional multipart,
  direct-transfer and resume support.
- `Item`, `JsPayload`, `NativePayload`, `PayloadKind` - the stream unit and its payload kinds.
- `StreamHandle` plus capability interfaces and guards (`RangeReadable`, `Seekable`,
  `BufferProvider`, `FillReadable`, `ResumableWritable`, ...).
- `ProviderContext`/`ProviderResolver`, `PayloadConverterExtension`, `TelemetryHooks`,
  `TransientIOError`/`PermanentIOError`.

See [pluggable-io-framework](https://github.com/flowscripter/pluggable-io-framework)
for full documentation.

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

Generate HTML API documentation:

`bunx typedoc index.ts`

### API

Link to auto-generated API docs:

[API Documentation](https://flowscripter.github.io/pluggable-io-framework-api/index.html)

## License

MIT © Flowscripter
