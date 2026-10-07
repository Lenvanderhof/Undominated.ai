#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(packageRoot, '../..')
const destination = join(packageRoot, 'resources')
const sources = JSON.parse(await readFile(join(packageRoot, 'scripts/resources-sources.json'), 'utf8'))

async function files(directory, prefix = '') {
  const result = []
  for (const name of (await readdir(directory)).sort()) {
    const path = join(directory, name)
    const relative = prefix ? `${prefix}/${name}` : name
    const stat = await lstat(path)
    if (stat.isSymbolicLink()) throw new Error(`resource source contains symlink: ${path}`)
    if (stat.isDirectory()) result.push(...await files(path, relative))
    else if (stat.isFile()) {
      const body = await readFile(path)
      result.push({ path: relative, sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length })
    } else throw new Error(`resource source contains special file: ${path}`)
  }
  return result
}

// Explicit output ownership: only this package's generated resource bundle is replaced.
await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
const resources = []
for (const source of sources) {
  const directory = join(destination, source.id)
  await mkdir(directory)
  if (source.kind === 'mcp-server') {
    for (const name of ['package.json', 'LICENSE', 'README.md', 'bin', 'src']) {
      await cp(join(root, source.path, name), join(directory, name), { recursive: true, dereference: false })
    }
  } else {
    await cp(join(root, source.path), directory, { recursive: true, dereference: false })
  }
  resources.push({ ...source, path: source.id, sourcePath: source.path, files: await files(directory) })
}
await writeFile(join(destination, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, resources }, null, 2)}\n`)
console.log(`Bundled ${resources.length} original resources with SHA-256 file manifests.`)
