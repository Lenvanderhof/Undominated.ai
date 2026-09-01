#!/usr/bin/env node
/**
 * Thin shell around src/cli.mjs. Everything testable lives there; this file
 * exists only to own the two things a test must not do — write to the real
 * stdio and set a real exit code.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { main } from '../src/cli.mjs'

function readPkg() {
  for (const rel of ['../package.json', '../../package.json']) {
    try {
      return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'))
    } catch {
      /* next */
    }
  }
  return { version: '0.1.0' }
}
const pkg = readPkg()

const { code, out, err } = await main(process.argv.slice(2), { version: pkg.version })
if (out) process.stdout.write(out)
if (err) process.stderr.write(err)
process.exitCode = code
