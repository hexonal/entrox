import { describe, expect, test } from "bun:test"
import { ReviewCommand, buildReviewRunArgs } from "../../../src/cli/cmd/review"

describe("ReviewCommand", () => {
  test("exposes a top-level review command", () => {
    expect(ReviewCommand.command).toBe("review [target]")
    expect(ReviewCommand.describe).toBe("review code changes")
  })

  test("runs the built-in review slash command through direct run mode", () => {
    expect(buildReviewRunArgs({ target: "origin/dev", model: "anthropic/claude", format: "json" })).toEqual([
      "run",
      "--command",
      "review",
      "--model",
      "anthropic/claude",
      "--format",
      "json",
      "origin/dev",
    ])
  })
})
