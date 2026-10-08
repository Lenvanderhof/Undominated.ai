#!/usr/bin/env node
/**
 * Accidental `npm publish` is the failure mode. The orchestrator must set
 * UNDOMINATED_PUBLISH=1 after a human go-ahead. See PUBLISH.md.
 */
if (process.env.UNDOMINATED_PUBLISH !== '1') {
  console.error(
    'blocked: do not publish until the orchestrator says so. See packages/undominated-mcp/PUBLISH.md',
  )
  process.exit(1)
}
