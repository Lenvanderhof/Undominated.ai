#!/usr/bin/env node
/**
 * Stdio MCP server. Testable logic lives in src/; this file owns process I/O.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { runStdio } from '../src/server.mjs'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
)

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(`undominated-mcp ${pkg.version} — read-only MCP server

Quotes published JSON from https://undominated.ai. Unrated is not zero.
Artificial Analysis scores are never returned. This is not a router.

Usage
  npx undominated-mcp

Speak JSON-RPC on stdin (newline-delimited). If stdin is a TTY this
process exits: it is meant to be launched by an MCP host.

Env
  UNDOMINATED_ORIGIN   default https://undominated.ai
`)
  process.exit(0)
}

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  process.stdout.write(`${pkg.version}\n`)
  process.exit(0)
}

if (process.stdin.isTTY && process.env.MCP_FORCE_STDIO !== '1') {
  process.stderr.write(
    'undominated-mcp is an MCP stdio server. Launch it from Claude Desktop, Cursor, or another MCP host, or pipe JSON-RPC to stdin.\n',
  )
  process.exit(1)
}

await runStdio({ version: pkg.version })
