import { afterEach, describe, expect, test } from "bun:test"
import { Option, Redacted } from "effect"
import { Flag } from "@opencode-ai/core/flag/flag"
import { ServerAuth } from "../../src/server/auth"

const original = {
  ENTROX_SERVER_PASSWORD: Flag.ENTROX_SERVER_PASSWORD,
  ENTROX_SERVER_USERNAME: Flag.ENTROX_SERVER_USERNAME,
  OPENCODE_SERVER_PASSWORD: Flag.OPENCODE_SERVER_PASSWORD,
  OPENCODE_SERVER_USERNAME: Flag.OPENCODE_SERVER_USERNAME,
}

afterEach(() => {
  Flag.ENTROX_SERVER_PASSWORD = original.ENTROX_SERVER_PASSWORD
  Flag.ENTROX_SERVER_USERNAME = original.ENTROX_SERVER_USERNAME
  Flag.OPENCODE_SERVER_PASSWORD = original.OPENCODE_SERVER_PASSWORD
  Flag.OPENCODE_SERVER_USERNAME = original.OPENCODE_SERVER_USERNAME
})

describe("ServerAuth", () => {
  test("does not emit auth headers without a password", () => {
    Flag.ENTROX_SERVER_PASSWORD = undefined
    Flag.ENTROX_SERVER_USERNAME = undefined
    Flag.OPENCODE_SERVER_PASSWORD = undefined
    Flag.OPENCODE_SERVER_USERNAME = "alice"

    expect(ServerAuth.header()).toBeUndefined()
    expect(ServerAuth.headers()).toBeUndefined()
  })

  test("defaults to the entrox username", () => {
    Flag.ENTROX_SERVER_PASSWORD = undefined
    Flag.ENTROX_SERVER_USERNAME = undefined
    Flag.OPENCODE_SERVER_PASSWORD = "secret"
    Flag.OPENCODE_SERVER_USERNAME = undefined

    expect(ServerAuth.headers()).toEqual({
      Authorization: `Basic ${Buffer.from("entrox:secret").toString("base64")}`,
    })
  })

  test("uses the configured username", () => {
    Flag.ENTROX_SERVER_PASSWORD = undefined
    Flag.ENTROX_SERVER_USERNAME = undefined
    Flag.OPENCODE_SERVER_PASSWORD = "secret"
    Flag.OPENCODE_SERVER_USERNAME = "alice"

    expect(ServerAuth.headers()).toEqual({
      Authorization: `Basic ${Buffer.from("alice:secret").toString("base64")}`,
    })
  })

  test("prefers explicit credentials", () => {
    Flag.ENTROX_SERVER_PASSWORD = undefined
    Flag.ENTROX_SERVER_USERNAME = undefined
    Flag.OPENCODE_SERVER_PASSWORD = "secret"
    Flag.OPENCODE_SERVER_USERNAME = "alice"

    expect(ServerAuth.headers({ password: "cli-secret", username: "bob" })).toEqual({
      Authorization: `Basic ${Buffer.from("bob:cli-secret").toString("base64")}`,
    })
  })

  test("validates decoded credentials against effect config", () => {
    const config = { password: Option.some("secret"), username: "alice" }

    expect(ServerAuth.required(config)).toBe(true)
    expect(ServerAuth.authorized({ username: "alice", password: Redacted.make("secret") }, config)).toBe(true)
    expect(ServerAuth.authorized({ username: "opencode", password: Redacted.make("secret") }, config)).toBe(false)
  })

  test("prefers entrox auth environment flags", () => {
    Flag.ENTROX_SERVER_PASSWORD = "entrox-secret"
    Flag.ENTROX_SERVER_USERNAME = "entrox-user"
    Flag.OPENCODE_SERVER_PASSWORD = "legacy-secret"
    Flag.OPENCODE_SERVER_USERNAME = "legacy-user"

    expect(ServerAuth.headers()).toEqual({
      Authorization: `Basic ${Buffer.from("entrox-user:entrox-secret").toString("base64")}`,
    })
  })
})
