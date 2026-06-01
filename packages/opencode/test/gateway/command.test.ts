import { describe, expect, test } from "bun:test"
import { Brand } from "../../src/brand"
import { runGatewayAction } from "../../src/cli/cmd/gateway"

describe("gateway command helpers", () => {
  test("wraps status action in the JSON payload shape used by Desktop", async () => {
    await expect(
      runGatewayAction({
        action: "status",
        auth: {
          all: async () => ({
            [Brand.authProviderURL]: { type: "wellknown", key: "ENTROX_TOKEN", token: "token" },
            "entro-openai": { type: "api", key: "sk-openai" },
          }),
          remove: async () => {},
          set: async () => {},
        },
        config: {
          getGlobal: async () => ({
            provider: {
              "entro-openai": { name: "Entrox OpenAI" },
            },
          }),
          updateGlobal: async () => {},
        },
      }),
    ).resolves.toEqual({
      ok: true,
      action: "status",
      status: {
        loggedIn: true,
        loginURL: Brand.authProviderURL,
        managedProviders: [{ id: "entro-openai", name: "Entrox OpenAI", authenticated: true }],
      },
    })
  })
})
