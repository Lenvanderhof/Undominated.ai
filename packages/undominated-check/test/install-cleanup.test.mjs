import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { installResources } from '../src/resources.mjs'

for (const change of ['replacement', 'same-inode-edit', 'unchanged', 'partial-write']) {
  test(`write-error cleanup preserves ownership: ${change}`, async () => {
    const project = await fs.mkdtemp(join(tmpdir(), 'undominated-cleanup-'))
    const originalOpen = fs.open, foreign = 'new owner data must survive\n'
    let firstPath, calls = 0, failure
    fs.open = async (...args) => {
      calls++
      if (calls === 1) {
        firstPath = args[0]
        const handle = await originalOpen(...args)
        if (change === 'partial-write') {
          const originalWrite = handle.writeFile.bind(handle)
          handle.writeFile = async () => { await originalWrite('partial'); throw Object.assign(new Error('injected write failure'), { code: 'EIO' }) }
        }
        return handle
      }
      if (calls === 2) {
        if (change === 'replacement') {
          await fs.writeFile(`${firstPath}.replacement`, foreign)
          await fs.rename(`${firstPath}.replacement`, firstPath)
        } else if (change === 'same-inode-edit') await fs.writeFile(firstPath, foreign)
        throw Object.assign(new Error('injected later open failure'), { code: 'EIO' })
      }
      return originalOpen(...args)
    }
    syncBuiltinESMExports()
    try {
      await installResources('undominated-evidence-audit', { project, targets: ['claude', 'cursor'] })
      assert.fail('expected an injected write error')
    } catch (error) { failure = error } finally { fs.open = originalOpen; syncBuiltinESMExports() }
    try {
      assert.match(failure.message, /injected/)
      if (change === 'unchanged') assert.deepEqual(await fs.readdir(project), [])
      else {
        assert.equal(await fs.readFile(firstPath, 'utf8'), change === 'partial-write' ? 'partial' : foreign)
        assert.match(failure.message, /Cleanup retained 1 changed or partial file/)
        assert.deepEqual(await fs.readdir(project), ['.claude'])
      }
    } finally { await fs.rm(project, { recursive: true, force: true }) }
  })
}
