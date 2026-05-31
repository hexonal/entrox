import { describe, expect, test } from "bun:test"
import { Brand, brandText, brandUserAgent } from "../../src/brand"

describe("Brand", () => {
  test("centralizes Entrox user-visible URLs", () => {
    expect(Brand.websiteURL).toBe("https://entrox.996icu.wiki")
    expect(Brand.docsURL).toBe("https://entrox.996icu.wiki/docs")
    expect(Brand.configSchemaURL).toBe("https://entrox.996icu.wiki/config.json")
    expect(Brand.themeSchemaURL).toBe("https://entrox.996icu.wiki/theme.json")
  })

  test("builds Entrox user agents", () => {
    expect(brandUserAgent("1.2.3")).toBe("entrox/1.2.3")
    expect(brandUserAgent("1.2.3", "cloudflare-ai-gateway")).toBe("entrox/1.2.3 cloudflare-ai-gateway")
  })

  test("rewrites bundled upstream prompt text at load time", () => {
    expect(
      brandText("You are OpenCode. Read opencode docs at https://opencode.ai and report https://github.com/anomalyco/opencode/issues"),
    ).toBe("You are Entrox. Read entrox docs at https://entrox.996icu.wiki and report https://entrox.996icu.wiki/support")
  })

  test("does not rewrite compatibility package scopes", () => {
    expect(brandText('import type { Plugin } from "@opencode-ai/plugin"')).toBe(
      'import type { Plugin } from "@opencode-ai/plugin"',
    )
  })
})
