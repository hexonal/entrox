import { describe, expect, test } from "bun:test"
import { shouldUseCachedLatest } from "../../src/cli/upgrade"

const now = 1_000_000

describe("upgrade cache", () => {
  test("refreshes Entrox no-update cache after the short interval", () => {
    expect(
      shouldUseCachedLatest({
        command: "entrox",
        checkedAt: now - 10 * 60 * 1000,
        now,
        cachedLatest: "0.0.0-ci.30.1",
        currentVersion: "0.0.0-ci.30.1",
      }),
    ).toBe(false)
  })

  test("keeps using Entrox cached update notices without another network check", () => {
    expect(
      shouldUseCachedLatest({
        command: "entrox",
        checkedAt: now - 10 * 60 * 1000,
        now,
        cachedLatest: "0.0.0-ci.31.1",
        currentVersion: "0.0.0-ci.30.1",
      }),
    ).toBe(true)
  })

  test("keeps the default cache interval for opencode", () => {
    expect(
      shouldUseCachedLatest({
        command: "opencode",
        checkedAt: now - 10 * 60 * 1000,
        now,
        cachedLatest: "0.0.0-ci.30.1",
        currentVersion: "0.0.0-ci.30.1",
      }),
    ).toBe(true)
  })
})
