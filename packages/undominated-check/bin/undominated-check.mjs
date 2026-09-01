#!/usr/bin/env node
/**
 * Thin shell around src/cli.mjs. Everything testable lives there; this file
 * exists only to own the two things a test must not do — write to the real
 * stdio and set a real exit code.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { main } from '../src/cli.mjs'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
)

const { code, out, err } = await main(process.argv.slice(2), { version: pkg.version })
if (out) process.stdout.write(out)
if (err) process.stderr.write(err)
process.exitCode = code
