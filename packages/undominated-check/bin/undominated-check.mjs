#!/usr/bin/env node
/**
 * Thin shell around src/cli.mjs. Everything testable lives there; this file
 * exists only to own the two things a test must not do — write to the real
 * stdio and set a real exit code.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { main, parseArgs } from '../src/cli.mjs'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
)

const argv = process.argv.slice(2)
const opts = parseArgs(argv)

if (opts.mcp && !opts.error && !opts.help && !opts.version) {
  // Long-running: stdio belongs to the protocol until the client hangs up.
  const { serveStdio } = await import('../src/mcp.mjs')
  await serveStdio({ origin: opts.origin, local: opts.local, version: pkg.version })
} else {
  const { code, out, err } = await main(argv, {
    version: pkg.version,
    tty: Boolean(process.stdout.isTTY),
    env: process.env,
  })
  if (out) process.stdout.write(out)
  if (err) process.stderr.write(err)
  process.exitCode = code
}
