import { describe, expect, test } from "bun:test"
import { brandDictionary, brandText } from "./brand"

describe("brand", () => {
  test("rewrites user-facing legacy names", () => {
    expect(brandText("OpenCode uses opencode.json and the 'opencode' command")).toBe(
      "Entrox uses entrox.json and the 'entrox' command",
    )
  })

  test("rewrites upstream hosted surfaces to Entrox endpoints", () => {
    expect(brandText("OpenCode Zen docs live at https://opencode.ai/zen and opencode.ai/docs")).toBe(
      "Entrox docs live at https://entrox.996icu.wiki/auth and entrox.996icu.wiki/docs",
    )
  })

  test("rewrites dictionary values without changing keys", () => {
    const dict = brandDictionary({
      "provider.opencode.title": "OpenCode models",
    })

    expect(dict).toEqual({
      "provider.opencode.title": "Entrox models",
    })
  })

  test("does not rewrite compatibility package scopes", () => {
    expect(brandText('Install "@opencode-ai/plugin" before running opencode')).toBe(
      'Install "@opencode-ai/plugin" before running entrox',
    )
  })
})
