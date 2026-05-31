import { describe, expect, test } from "bun:test"
import {
  credentialDisplayName,
  loginActionOptions,
  normalizeWellKnownProviderURL,
  providerOptions,
} from "../../../../src/cli/cmd/tui/component/dialog-provider"

describe("providerOptions", () => {
  test("exposes Entrox browser login and configured providers", () => {
    expect(
      providerOptions([
        { id: "openai", name: "OpenAI" },
        { id: "google", name: "Gemini" },
      ]),
    ).toMatchObject([
      {
        title: "Entrox",
        description: "Browser login",
        category: "Provider",
      },
      {
        title: "Gemini",
        value: "google",
        category: "Configured",
      },
      {
        title: "OpenAI",
        value: "openai",
        category: "Configured",
      },
    ])
  })

  test("does not expose upstream opencode provider as a provider choice", () => {
    const names = providerOptions([
      { id: "opencode", name: "opencode" },
      { id: "google", name: "Gemini" },
    ]).map((option) => option.title)
    expect(names).toContain("Gemini")
    expect(names).not.toContain("opencode")
  })

  test("does not expose custom provider option", () => {
    const options = providerOptions([{ id: "other", name: "Other Provider" }])
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

  test("offers to keep an existing Entrox credential before replacing it", () => {
    expect(loginActionOptions(true)).toMatchObject([
      { label: "Use existing Entrox login", value: "keep" },
      { label: "Log in again", value: "replace" },
    ])
    expect(loginActionOptions(false)).toEqual([])
  })

  test("renders the bundled auth provider as Entrox instead of its URL", () => {
    expect(credentialDisplayName("https://entrox.996icu.wiki", "https://entrox.996icu.wiki")).toBe("Entrox")
    expect(credentialDisplayName("https://sub.example.com", "https://entrox.996icu.wiki")).toBe("https://sub.example.com")
  })
})
