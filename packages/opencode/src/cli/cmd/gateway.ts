import { Auth } from "@/auth"
import { Config } from "@/config/config"
import {
  createGatewayServiceStores,
  getGatewayStatus,
  logoutGateway,
  syncGateway,
  type GatewayAuthStore,
  type GatewayConfigStore,
} from "@/gateway/sync"
import type { GatewayFetch } from "@/gateway/sub2api"
import { Effect } from "effect"
import { CliError, effectCmd } from "../effect-cmd"
import { cmd } from "./cmd"

type GatewayAction = "logout" | "status" | "sync"

type GatewayActionInput = {
  action: GatewayAction
  auth: GatewayAuthStore
  baseUrl?: string
  config: GatewayConfigStore
  fetch?: GatewayFetch
  token?: string
}

type GatewayCommandArgs = {
  json?: boolean
}

export async function runGatewayAction(input: GatewayActionInput) {
  if (input.action === "status") {
    return {
      ok: true as const,
      action: input.action,
      status: await getGatewayStatus(input),
    }
  }

  if (input.action === "sync") {
    return {
      ok: true as const,
      action: input.action,
      sync: await syncGateway(input),
    }
  }

  return {
    ok: true as const,
    action: input.action,
    logout: await logoutGateway(input),
  }
}

export function formatGatewayCommandJSON(payload: Awaited<ReturnType<typeof runGatewayAction>>) {
  return `${JSON.stringify(payload)}\n`
}

export const GatewayCommand = cmd({
  command: "gateway",
  describe: "manage Entrox gateway providers",
  builder: (yargs) =>
    yargs.command(GatewayStatusCommand).command(GatewaySyncCommand).command(GatewayLogoutCommand).demandCommand(),
  async handler() {},
})

const GatewayStatusCommand = effectCmd({
  command: "status",
  describe: "show Entrox gateway login and provider sync status",
  builder: gatewayCommandBuilder,
  instance: false,
  handler: Effect.fn("Cli.gateway.status")(function* (args: GatewayCommandArgs) {
    yield* runGatewayCommand("status", args)
  }),
})

const GatewaySyncCommand = effectCmd({
  command: "sync",
  describe: "sync Entrox gateway providers",
  builder: gatewayCommandBuilder,
  instance: false,
  handler: Effect.fn("Cli.gateway.sync")(function* (args: GatewayCommandArgs) {
    yield* runGatewayCommand("sync", args)
  }),
})

const GatewayLogoutCommand = effectCmd({
  command: "logout",
  describe: "remove Entrox-managed gateway providers",
  builder: gatewayCommandBuilder,
  instance: false,
  handler: Effect.fn("Cli.gateway.logout")(function* (args: GatewayCommandArgs) {
    yield* runGatewayCommand("logout", args)
  }),
})

function gatewayCommandBuilder(yargs: import("yargs").Argv) {
  return yargs.option("json", {
    describe: "print machine-readable JSON",
    type: "boolean",
  })
}

function runGatewayCommand(action: GatewayAction, args: GatewayCommandArgs) {
  return Effect.gen(function* () {
    const auth = yield* Auth.Service
    const config = yield* Config.Service
    const payload = yield* Effect.tryPromise({
      try: () => runGatewayAction({ action, ...createGatewayServiceStores({ auth, config }) }),
      catch: (error) => new CliError({ message: errorMessage(error) }),
    })
    process.stdout.write(args.json ? formatGatewayCommandJSON(payload) : formatGatewayCommandText(payload))
  })
}

function formatGatewayCommandText(payload: Awaited<ReturnType<typeof runGatewayAction>>) {
  if (payload.action === "status") {
    return [
      `Logged in: ${payload.status.loggedIn ? "yes" : "no"}`,
      `Login URL: ${payload.status.loginURL}`,
      `Managed providers: ${payload.status.managedProviders.length}`,
      "",
    ].join("\n")
  }

  if (payload.action === "sync") {
    return [
      `Synced providers: ${payload.sync.summary.providerCount}`,
      `Models: ${payload.sync.summary.modelCount}`,
      `Failures: ${payload.sync.summary.failedCount}`,
      "",
    ].join("\n")
  }

  return [
    `Removed credentials: ${payload.logout.removedAuth.length}`,
    `Removed providers: ${payload.logout.removedProviders.length}`,
    "",
  ].join("\n")
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}
