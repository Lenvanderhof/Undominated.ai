# Discussion seeds

Opening threads for [Discussions](https://github.com/Lenvanderhof/Undominated.ai/discussions),
one file each. `scripts/seed-discussions.mjs` posts any whose title does not exist yet; the
`seed discussions` workflow runs it from Actions (dry run unless told otherwise).

Front matter: `title`, `category` (a category slug), optional `fallback` (comma-separated
slugs tried in order). Every figure in a seed carries the date it was true on and the
generated source it came from — the same rule as the README. Once posted, the thread is
the record; editing a file here does not edit the thread.
