import { describe, expect, test } from "bun:test"
import { Brand, brandUserAgent } from "../../src/brand"

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
})
