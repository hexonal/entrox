import { describe, expect, test } from "bun:test"
import { lspEmptyMessage } from "../../../../src/cli/cmd/tui/feature-plugins/sidebar/lsp"

describe("lspEmptyMessage", () => {
  test("explains how to enable LSP when it is disabled", () => {
    expect(lspEmptyMessage(false)).toBe('LSPs are disabled. Set "lsp": true in entrox.json to enable code intelligence.')
  })

  test("explains activation when LSP is enabled but idle", () => {
    expect(lspEmptyMessage(true)).toBe("LSPs will activate as files are read")
  })
})
