import { describe, expect, test } from "bun:test"
import {
  buildGatewayProviderConfig,
  createGatewayProviderId,
  getRemoteGatewayConfig,
  getOrCreateApiKeyForGroup,
  isGatewayProviderId,
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
    expect(isGatewayProviderId("entrox")).toBe(true)
    expect(isGatewayProviderId("entrox-anthropic")).toBe(true)
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

  test("loads remote config with API key auth and strips env apiKey placeholders", async () => {
    const requests: Array<{ auth?: string | null; url: string }> = []
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      requests.push({ url: String(input), auth: headers.get("authorization") })
      if (String(input).endsWith("/.well-known/opencode")) {
        return Response.json({
          remote_config: {
            url: "https://entrox.996icu.wiki/api/v1/entrox/opencode/config",
            headers: { Authorization: "Bearer {env:SUB2API_API_KEY}" },
          },
        })
      }
      return Response.json({
        config: {
          provider: {
            entrox: {
              npm: "@ai-sdk/openai-compatible",
              name: "Entrox",
              options: {
                baseURL: "https://entrox.996icu.wiki/v1",
                apiKey: "{env:SUB2API_API_KEY}",
              },
              models: { "gpt-5": { name: "GPT-5" } },
            },
          },
        },
      })
    }

    await expect(getRemoteGatewayConfig({ apiKey: "sk-test", fetch: fetcher })).resolves.toEqual({
      provider: {
        entrox: {
          npm: "@ai-sdk/openai-compatible",
          name: "Entrox",
          options: { baseURL: "https://entrox.996icu.wiki/v1" },
          models: { "gpt-5": { name: "GPT-5" } },
        },
      },
    })
    expect(requests).toEqual([
      { url: "https://entrox.996icu.wiki/.well-known/opencode", auth: "Bearer sk-test" },
      { url: "https://entrox.996icu.wiki/api/v1/entrox/opencode/config", auth: "Bearer sk-test" },
    ])
  })
})
