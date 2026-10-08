import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

test('package is an unscoped public MCP binary with a publish gate', () => {
  assert.equal(pkg.name, 'undominated-mcp')
  assert.equal(pkg.version, '0.1.0')
  assert.equal(pkg.private, undefined)
  assert.equal(pkg.publishConfig?.access, 'public')
  assert.equal(pkg.bin['undominated-mcp'], 'bin/undominated-mcp.mjs')
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0)
  assert.equal(pkg.scripts.prepublishOnly, 'node ./prepublish.mjs')
  assert.equal(pkg.mcpName, 'io.github.lenvanderhof/undominated-mcp')
  assert.ok(pkg.files.includes('bin'))
  assert.ok(pkg.files.includes('src'))
})

test('prepublish blocks unless UNDOMINATED_PUBLISH=1', () => {
  const blocked = spawnSync(process.execPath, ['prepublish.mjs'], {
    cwd: root,
    env: { ...process.env, UNDOMINATED_PUBLISH: '' },
    encoding: 'utf8',
  })
  assert.notEqual(blocked.status, 0)
  assert.match(blocked.stderr, /PUBLISH\.md/)
  const ok = spawnSync(process.execPath, ['prepublish.mjs'], {
    cwd: root,
    env: { ...process.env, UNDOMINATED_PUBLISH: '1' },
    encoding: 'utf8',
  })
  assert.equal(ok.status, 0)
})

test('registry manifests name stdio npx undominated-mcp and do not route', () => {
  const server = JSON.parse(readFileSync(resolve(root, 'server.json'), 'utf8'))
  assert.equal(server.name, 'io.github.lenvanderhof/undominated-mcp')
  const smithery = readFileSync(resolve(root, 'smithery.yaml'), 'utf8')
  assert.match(smithery, /undominated-mcp/)
  assert.doesNotMatch(smithery, /switch model|router|affiliate/i)
  const pub = readFileSync(resolve(root, 'PUBLISH.md'), 'utf8')
  assert.match(pub, /otp/i)
  assert.match(pub, /UNDOMINATED_PUBLISH=1/)
  assert.doesNotMatch(pub, /AIDREAMTEAM/)
})
