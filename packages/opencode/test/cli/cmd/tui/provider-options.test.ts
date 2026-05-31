import { describe, expect, test } from "bun:test"
import {
  normalizeWellKnownProviderURL,
  providerOptions,
} from "../../../../src/cli/cmd/tui/component/dialog-provider"

describe("providerOptions", () => {
  test("only exposes Entrox browser login", () => {
    expect(
      providerOptions([
        { id: "openai", name: "OpenAI" },
        { id: "anthropic", name: "Anthropic" },
        { id: "github-copilot", name: "GitHub Copilot" },
      ]),
    ).toMatchObject([
      {
        title: "Entrox",
        description: "Browser login",
        category: "Provider",
      },
    ])
  })

  test("does not expose upstream provider names", () => {
    const names = providerOptions([{ id: "openai", name: "OpenAI" }]).map((option) => option.title)
    expect(names).not.toContain("OpenAI")
  })

  test("does not expose custom provider option", () => {
    const options = providerOptions([{ id: "other", name: "Other Provider" }])
    expect(options).toHaveLength(1)
    expect(options.map((option) => option.title)).not.toContain("Other")
    expect(options.map((option) => option.description)).not.toContain("Custom provider")
  })

  test("normalizes and validates well-known provider urls", () => {
    expect(normalizeWellKnownProviderURL("https://entrox.996icu.wiki/")).toBe("https://entrox.996icu.wiki")
    expect(normalizeWellKnownProviderURL(" https://sub.example.com/ ")).toBe("https://sub.example.com")
    expect(normalizeWellKnownProviderURL("http://localhost:3000/")).toBe("http://localhost:3000")
    expect(normalizeWellKnownProviderURL("ftp://sub.example.com")).toBeUndefined()
    expect(normalizeWellKnownProviderURL("sub.example.com")).toBeUndefined()
  })
})
