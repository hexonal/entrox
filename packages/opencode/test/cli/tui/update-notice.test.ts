import { describe, expect, test } from "bun:test"
import { isUpdateNewerThan, updateNoticeVersion } from "@opencode-ai/tui/update-notice"

describe("update notice", () => {
  test("treats newer ci versions as available", () => {
    expect(isUpdateNewerThan("0.0.0-ci.26.1", "0.0.0-ci.25.1")).toBe(true)
  })

  test("does not treat older ci versions as available", () => {
    expect(isUpdateNewerThan("0.0.0-ci.25.1", "0.0.0-ci.26.1")).toBe(false)
  })

  test("does not treat the same ci version as available", () => {
    expect(isUpdateNewerThan("0.0.0-ci.26.1", "0.0.0-ci.26.1")).toBe(false)
  })

  test("keeps a newer cached ci version available for the TUI", () => {
    expect(updateNoticeVersion("999.0.0")).toBe("999.0.0")
  })

  test("hides a cached ci version the user skipped", () => {
    expect(updateNoticeVersion("999.0.0", "999.0.0")).toBeUndefined()
  })
})
