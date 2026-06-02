import { describe, expect, test } from "bun:test"
import { isUpdateNewerThan } from "../../../src/cli/cmd/tui/update-notice"

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
})
