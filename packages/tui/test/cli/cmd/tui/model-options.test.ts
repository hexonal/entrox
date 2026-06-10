import { describe, expect, test } from "bun:test"
import {
  isVisibleModelProviderID,
  visibleModelProviders,
  visibleModelSelections,
} from "../../../../src/util/model-provider-visibility"
import { sortModelOptions } from "../../../../src/component/dialog-model"

describe("sortModelOptions", () => {
  test("orders provider-scoped model choices by newest release first", () => {
    const sorted = sortModelOptions(
      [
        { title: "GPT 5.2", releaseDate: "2025-12-11" },
        { title: "GPT 5.4", releaseDate: "2026-03-05" },
        { title: "GPT 5.1", releaseDate: "2025-11-13" },
      ],
      true,
    )

    expect(sorted.map((model) => model.title)).toEqual(["GPT 5.4", "GPT 5.2", "GPT 5.1"])
  })

  test("preserves free-first alphabetical ordering for the regular picker", () => {
    const sorted = sortModelOptions(
      [
        { title: "Beta", releaseDate: "2026-01-01" },
        { title: "Alpha", releaseDate: "2025-01-01", footer: "Free" },
        { title: "Gamma", releaseDate: "2024-01-01", footer: "Free" },
      ],
      false,
    )

    expect(sorted.map((model) => model.title)).toEqual(["Alpha", "Gamma", "Beta"])
  })
})

describe("visible model providers", () => {
  test("uses the Entrox brand allowlist for the regular model picker", () => {
    expect(isVisibleModelProviderID("entrox")).toBe(true)
    expect(isVisibleModelProviderID("entrox-gemini")).toBe(true)
    expect(isVisibleModelProviderID("cloudflare-workers-ai")).toBe(false)
    expect(isVisibleModelProviderID("opencode")).toBe(false)
  })

  test("hides non-Entrox providers from regular picker provider options", () => {
    const providers = visibleModelProviders([
      { id: "cloudflare-workers-ai", name: "Cloudflare Workers AI" },
      { id: "entrox", name: "Entrox" },
      { id: "entrox-gemini", name: "Entrox Gemini" },
      { id: "opencode", name: "opencode" },
    ])

    expect(providers.map((provider) => provider.id)).toEqual(["entrox", "entrox-gemini"])
  })

  test("hides stale recents and favorites from non-Entrox providers", () => {
    const selections = visibleModelSelections([
      { providerID: "cloudflare-workers-ai", modelID: "@cf/meta/llama-3" },
      { providerID: "entrox", modelID: "claude-sonnet-4" },
      { providerID: "entrox-openai", modelID: "gpt-5.5" },
      { providerID: "opencode", modelID: "grok-code-fast-1" },
    ])

    expect(selections).toEqual([
      { providerID: "entrox", modelID: "claude-sonnet-4" },
      { providerID: "entrox-openai", modelID: "gpt-5.5" },
    ])
  })
})
