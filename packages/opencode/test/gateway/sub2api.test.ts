import { describe, expect, test } from "bun:test"
import {
  buildGatewayProviderConfig,
  createGatewayProviderId,
  getOrCreateApiKeyForGroup,
  listAvailableGroups,
  normalizeGatewayURL,
} from "../../src/gateway/sub2api"

describe("Sub2API gateway helpers", () => {
  test("normalizes gateway URLs", () => {
    expect(normalizeGatewayURL("https://entrox.996icu.wiki/v1")).toBe("https://entrox.996icu.wiki")
    expect(normalizeGatewayURL("https://entrox.996icu.wiki/api/v1")).toBe("https://entrox.996icu.wiki")
    expect(normalizeGatewayURL("https://entrox.996icu.wiki///")).toBe("https://entrox.996icu.wiki")
  })

  test("derives Entrox-managed provider IDs", () => {
    expect(createGatewayProviderId("OpenAI")).toBe("entro-openai")
    expect(createGatewayProviderId("Claude Code")).toBe("entro-claude-code")
    expect(createGatewayProviderId("")).toBe("entro-platform")
  })

  test("lists available groups from the management endpoint", async () => {
    const requests: Array<{ url: string; method: string }> = []
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), method: init?.method ?? "GET" })
      return Response.json({ data: [{ id: 1, name: "OpenAI", platform: "openai", status: "active" }] })
    }

    await expect(listAvailableGroups({ token: "token", fetch: fetcher })).resolves.toMatchObject([
      { id: 1, name: "OpenAI", platform: "openai", status: "active" },
    ])
    expect(requests).toEqual([{ url: "https://entrox.996icu.wiki/api/v1/groups/available", method: "GET" }])
  })

  test("creates a group-bound API key when one does not exist", async () => {
    const requests: Array<{ url: string; method: string; body?: unknown }> = []
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })
      if (init?.method === "POST") return Response.json({ data: { id: 2, key: "sk-openai", group_id: 1 } })
      return Response.json({ data: [] })
    }

    await expect(
      getOrCreateApiKeyForGroup({ token: "token", groupId: 1, name: "Entrox OpenAI", fetch: fetcher }),
    ).resolves.toMatchObject({ key: "sk-openai", groupId: 1 })
    expect(requests[1]).toMatchObject({ method: "POST", body: { name: "Entrox OpenAI", group_id: 1 } })
  })

  test("builds OpenAI-compatible provider config", () => {
    expect(buildGatewayProviderConfig({ name: "Entrox OpenAI", models: { "gpt-5": { name: "GPT-5" } } })).toEqual({
      npm: "@ai-sdk/openai-compatible",
      name: "Entrox OpenAI",
      options: { baseURL: "https://entrox.996icu.wiki/v1" },
      models: { "gpt-5": { name: "GPT-5" } },
    })
  })
})
