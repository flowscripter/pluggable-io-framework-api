# pluggable-io-framework-api notes

- Checks: `bunx tsc --noEmit -p tsconfig.json`, `bunx oxlint index.ts src/ tests/`, `bunx oxfmt --check`, `bun test`, `bun run build`, `bunx typedoc index.ts` (typedoc fails on any tsc error).
- Source grouped under `src/provider`, `src/item` (with `payload/`), `src/stream`, `src/capability`, `src/decorator`, `src/error`, `src/util`; tests mirror 1:1 under `tests/`.
- `MultipartWriter<K>` (`src/stream/MultipartWriter.ts`) is the `getMultipartWriter` return type; `getMultipartWriter(path, partSize, opts?: { resume?: ResumeToken })`. A resumable writer implements `ResumableWritable`; `isResumableWritable` accepts any object (PR #23, 3.1.0).
- `ProviderResolver.createProviderForLocation` takes a string: removing string locations would be an API major.
