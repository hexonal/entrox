import { describe, expect, test } from "bun:test"
import { brandDictionary, brandText } from "./brand"

describe("brand", () => {
  test("rewrites user-facing legacy names", () => {
    expect(brandText("OpenCode uses opencode.json and the 'opencode' command")).toBe(
      "Entrox uses entrox.json and the 'entrox' command",
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
})
