import { describe, expect, test } from "bun:test"
import { Brand } from "../../src/brand"
import { getGatewayStatus, logoutGateway, syncGateway } from "../../src/gateway/sync"

describe("gateway sync", () => {
  test("syncs API-key login through the remote Entrox config endpoint", async () => {
    const auth = createAuthStore()
    const config = createConfigStore({
      provider: {
        "entro-openai": { name: "Stale Entrox OpenAI" },
        openai: { name: "User OpenAI" },
      },
    })

    const result = await syncGateway({
      token: "sk-login",
      auth,
      config,
      fetch: createRemoteConfigFetch({
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
          "entrox-anthropic": {
            npm: "@ai-sdk/anthropic",
            name: "Entrox",
            options: {
              baseURL: "https://entrox.996icu.wiki/v1",
              apiKey: "{env:SUB2API_API_KEY}",
            },
            models: { "claude-sonnet-4": { name: "Claude Sonnet 4" } },
          },
        },
      }),
    })

    expect(result.summary).toEqual({ providerCount: 2, modelCount: 2, failedCount: 0 })
    expect(auth.records.entrox).toEqual({ type: "api", key: "sk-login" })
    expect(auth.records["entrox-anthropic"]).toEqual({ type: "api", key: "sk-login" })
    expect(auth.records["entro-openai"]).toBeUndefined()
    expect(config.value.provider).toEqual({
      openai: { name: "User OpenAI" },
      entrox: {
        npm: "@ai-sdk/openai-compatible",
        name: "Entrox",
        options: { baseURL: "https://entrox.996icu.wiki/v1" },
        models: { "gpt-5": { name: "GPT-5" } },
      },
      "entrox-anthropic": {
        npm: "@ai-sdk/anthropic",
        name: "Entrox",
        options: { baseURL: "https://entrox.996icu.wiki/v1" },
        models: { "claude-sonnet-4": { name: "Claude Sonnet 4" } },
      },
    })
  })

  test("syncs active groups into provider auth and config", async () => {
    const auth = createAuthStore()
    const config = createConfigStore()

    const result = await syncGateway({
      token: "token",
      auth,
      config,
      fetch: createGatewayFetch({
        groups: [
          { id: 1, name: "OpenAI", platform: "openai", status: "active" },
          { id: 2, name: "Claude", platform: "anthropic", status: "inactive" },
          { id: 3, name: "Missing Platform", status: "active" },
        ],
        keys: [],
        createdKeys: { 1: "sk-openai" },
        models: [{ id: "gpt-5", name: "GPT-5" }],
      }),
    })

    expect(result.summary).toEqual({ providerCount: 1, modelCount: 1, failedCount: 0 })
    expect(auth.records["entro-openai"]).toEqual({ type: "api", key: "sk-openai" })
    expect(auth.records["entro-anthropic"]).toBeUndefined()
    expect(config.value.provider?.["entro-openai"]).toEqual({
      npm: "@ai-sdk/openai-compatible",
      name: "Entrox OpenAI",
      options: { baseURL: "https://entrox.996icu.wiki/v1" },
      models: { "gpt-5": { name: "GPT-5" } },
    })
  })

  test("keeps syncing other groups when one group fails", async () => {
    const auth = createAuthStore()
    const config = createConfigStore()

    const result = await syncGateway({
      token: "token",
      auth,
      config,
      fetch: createGatewayFetch({
        groups: [
          { id: 1, name: "OpenAI", platform: "openai", status: "active" },
          { id: 2, name: "Claude", platform: "anthropic", status: "active" },
        ],
        keys: [],
        createdKeys: { 1: "sk-openai" },
        failedGroupIds: [2],
        models: [{ id: "gpt-5", name: "GPT-5" }],
      }),
    })

    expect(result.summary).toEqual({ providerCount: 1, modelCount: 1, failedCount: 1 })
    expect(result.failures).toMatchObject([{ providerId: "entro-anthropic", label: "Entrox Claude" }])
    expect(auth.records["entro-openai"]).toEqual({ type: "api", key: "sk-openai" })
    expect(auth.records["entro-anthropic"]).toBeUndefined()
  })

  test("logout removes managed provider auth and config without touching user providers", async () => {
    const auth = createAuthStore({
      [Brand.authProviderURL]: { type: "wellknown", key: "ENTROX_TOKEN", token: "token" },
      "entro-openai": { type: "api", key: "sk-openai" },
      "entrox-anthropic": { type: "api", key: "sk-anthropic" },
      sub2api: { type: "api", key: "legacy" },
      openai: { type: "api", key: "user-openai" },
    })
    const config = createConfigStore({
      provider: {
        "entro-openai": { name: "Entrox OpenAI" },
        "entrox-anthropic": { name: "Entrox Anthropic" },
        sub2api: { name: "Legacy Gateway" },
        openai: { name: "User OpenAI" },
      },
    })

    const result = await logoutGateway({ auth, config })

    expect(result.removedAuth).toEqual(["entro-openai", "entrox-anthropic", "sub2api"])
    expect(auth.records[Brand.authProviderURL]).toEqual({ type: "wellknown", key: "ENTROX_TOKEN", token: "token" })
    expect(auth.records.openai).toEqual({ type: "api", key: "user-openai" })
    expect(auth.records["entro-openai"]).toBeUndefined()
    expect(config.value.provider).toEqual({ openai: { name: "User OpenAI" } })
  })

  test("reports login and managed provider status", async () => {
    const auth = createAuthStore({
      [Brand.authProviderURL]: { type: "wellknown", key: "ENTROX_TOKEN", token: "token" },
      "entro-openai": { type: "api", key: "sk-openai" },
    })
    const config = createConfigStore({
      provider: {
        "entro-openai": { name: "Entrox OpenAI" },
        openai: { name: "User OpenAI" },
      },
    })

    await expect(getGatewayStatus({ auth, config })).resolves.toEqual({
      loggedIn: true,
      loginURL: Brand.authProviderURL,
      managedProviders: [{ id: "entro-openai", name: "Entrox OpenAI", authenticated: true }],
    })
  })
})

type AuthRecord = { type: "api"; key: string } | { type: "wellknown"; key: string; token: string }

function createAuthStore(initial: Record<string, AuthRecord> = {}) {
  const records = { ...initial }
  return {
    records,
    all: async () => records,
    set: async (key: string, info: AuthRecord) => {
      records[key] = info
    },
    remove: async (key: string) => {
      delete records[key]
    },
  }
}

function createConfigStore(initial: { provider?: Record<string, unknown> } = {}) {
  const value = { provider: { ...(initial.provider ?? {}) } }
  return {
    value,
    getGlobal: async () => value,
    updateGlobal: async (patch: { provider?: Record<string, unknown> }) => {
      for (const [key, provider] of Object.entries(patch.provider ?? {})) {
        if (provider === undefined) {
          delete value.provider[key]
          continue
        }
        value.provider[key] = provider
      }
      return { info: value, changed: true }
    },
  }
}

function createGatewayFetch(input: {
  createdKeys: Record<number, string>
  failedGroupIds?: number[]
  groups: Array<Record<string, unknown>>
  keys: Array<Record<string, unknown>>
  models: Array<Record<string, unknown>>
}) {
  return async (request: string | URL | Request, init?: RequestInit) => {
    const url = String(request)
    if (url.endsWith("/api/v1/groups/available")) return Response.json({ data: input.groups })
    if (url.endsWith("/v1/models")) return Response.json({ data: input.models })
    if (url.endsWith("/api/v1/keys") && init?.method !== "POST") return Response.json({ data: input.keys })
    if (url.endsWith("/api/v1/keys") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { group_id: number; name: string }
      if (input.failedGroupIds?.includes(body.group_id)) {
        return Response.json({ message: `group ${body.group_id} failed` }, { status: 500 })
      }
      return Response.json({ data: { id: body.group_id, key: input.createdKeys[body.group_id], group_id: body.group_id } })
    }
    return Response.json({ message: `Unhandled ${url}` }, { status: 404 })
  }
}

function createRemoteConfigFetch(input: { provider: Record<string, unknown> }) {
  return async (request: string | URL | Request, init?: RequestInit) => {
    const url = String(request)
    const auth = new Headers(init?.headers).get("authorization")
    if (!auth) return Response.json({ message: "missing auth" }, { status: 401 })
    if (url.endsWith("/.well-known/opencode")) {
      return Response.json({
        remote_config: {
          url: "https://entrox.996icu.wiki/api/v1/entrox/opencode/config",
          headers: { Authorization: "Bearer {env:SUB2API_API_KEY}" },
        },
      })
    }
    if (url.endsWith("/api/v1/entrox/opencode/config")) {
      return Response.json({
        config: {
          provider: input.provider,
        },
      })
    }
    return Response.json({ message: `Unhandled ${url}` }, { status: 404 })
  }
}
