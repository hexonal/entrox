import { Brand } from "@/brand"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { Effect } from "effect"
import {
  buildGatewayProviderConfig,
  createGatewayProviderId,
  getOrCreateApiKeyForGroup,
  getRemoteGatewayConfig,
  isGatewayProviderId,
  LEGACY_GATEWAY_PROVIDER_ID,
  listAvailableGroups,
  listModels,
  normalizeGatewayURL,
  type GatewayFetch,
  type GatewayGroup,
  type GatewayProviderConfig,
} from "./sub2api"

export type GatewayStoredAuth =
  | GatewayProviderAuth
  | { type: "oauth"; access: string; accountId?: string; enterpriseUrl?: string; expires: number; refresh: string }
  | { type: "wellknown"; key: string; token: string }

export type GatewayProviderAuth =
  | { type: "api"; key: string; metadata?: Record<string, string> }

export type GatewayAuthStore = {
  all: () => Promise<Record<string, GatewayStoredAuth>> | Record<string, GatewayStoredAuth>
  remove: (key: string) => Promise<void> | void
  set: (key: string, info: GatewayProviderAuth) => Promise<void> | void
}

export type GatewayConfigInfo = {
  provider?: Record<string, unknown>
}

export type GatewayConfigStore = {
  getGlobal: () => Promise<GatewayConfigInfo> | GatewayConfigInfo
  updateGlobal: (config: GatewayConfigInfo) => Promise<unknown> | unknown
}

export type GatewaySyncInput = {
  auth: GatewayAuthStore
  baseUrl?: string
  config: GatewayConfigStore
  fetch?: GatewayFetch
  token?: string
}

export function createGatewayServiceStores(input: { auth: Auth.Interface; config: Config.Interface }) {
  return {
    auth: {
      all: () =>
        Effect.runPromise(input.auth.all().pipe(Effect.orDie)) as Promise<Record<string, GatewayStoredAuth>>,
      set: (key: string, info: GatewayStoredAuth) =>
        Effect.runPromise(input.auth.set(key, info as Auth.Info).pipe(Effect.orDie)),
      remove: (key: string) => Effect.runPromise(input.auth.remove(key).pipe(Effect.orDie)),
    },
    config: {
      getGlobal: () => Effect.runPromise(input.config.getGlobal()) as Promise<GatewayConfigInfo>,
      updateGlobal: (config: GatewayConfigInfo) => Effect.runPromise(input.config.updateGlobal(config as Config.Info)),
    },
  }
}

export type GatewayProviderSyncResult = {
  modelCount: number
  providerId: string
  providerName: string
}

export type GatewayProviderSyncFailure = {
  label: string
  providerId?: string
  reason: string
}

export type GatewaySyncResult = {
  failures: GatewayProviderSyncFailure[]
  providers: GatewayProviderSyncResult[]
  summary: {
    failedCount: number
    modelCount: number
    providerCount: number
  }
}

export async function syncGateway(input: GatewaySyncInput): Promise<GatewaySyncResult> {
  const baseUrl = normalizeGatewayURL(input.baseUrl)
  const token = input.token ?? (await getStoredGatewayToken(input.auth, baseUrl))
  if (!token) throw new Error(`Run ${Brand.command} login before syncing ${Brand.product} gateway providers`)

  if (isSub2APIKey(token)) {
    return syncGatewayFromAPIKey({ ...input, baseUrl, apiKey: token })
  }

  const groups = filterSyncableGroups(
    await listAvailableGroups({
      baseUrl,
      fetch: input.fetch,
      token,
    }),
  )
  const results = await Promise.all(groups.map((group) => syncGatewayGroup({ ...input, baseUrl, group, token })))
  const providers = results.flatMap((result) => (result.type === "synced" ? [result.provider] : []))
  const failures = results.flatMap((result) => (result.type === "failed" ? [result.failure] : []))

  await writeProviderConfig({
    config: input.config,
    providerConfigs: Object.fromEntries(
      results.flatMap((result) => (result.type === "synced" ? [[result.provider.providerId, result.config]] : [])),
    ),
    syncableProviderIds: new Set(groups.map((group) => group.providerId)),
  })
  await removeStaleProviderAuth({
    auth: input.auth,
    syncableProviderIds: new Set(groups.map((group) => group.providerId)),
  })

  return {
    providers,
    failures,
    summary: summarizeProviderSync({ providers, failures }),
  }
}

async function syncGatewayFromAPIKey(input: GatewaySyncInput & {
  apiKey: string
  baseUrl: string
}): Promise<GatewaySyncResult> {
  const remote = await getRemoteGatewayConfig({
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    fetch: input.fetch,
    token: input.apiKey,
  })
  const providerEntries = Object.entries(remote.provider).filter(([providerId]) => isGatewayProviderId(providerId))
  if (providerEntries.length === 0) {
    throw new Error("No Entrox gateway models are available for this API key")
  }

  await Promise.all(providerEntries.map(([providerId]) => input.auth.set(providerId, { type: "api", key: input.apiKey })))
  await writeProviderConfig({
    config: input.config,
    providerConfigs: Object.fromEntries(providerEntries),
    syncableProviderIds: new Set(providerEntries.map(([providerId]) => providerId)),
  })
  await removeStaleProviderAuth({
    auth: input.auth,
    syncableProviderIds: new Set(providerEntries.map(([providerId]) => providerId)),
  })

  const providers = providerEntries.map(([providerId, config]) => ({
    providerId,
    providerName: config.name,
    modelCount: Object.keys(config.models).length,
  }))

  return {
    providers,
    failures: [],
    summary: summarizeProviderSync({ providers, failures: [] }),
  }
}

export async function logoutGateway(input: { auth: GatewayAuthStore; config: GatewayConfigStore }) {
  const authRecords = await input.auth.all()
  const removedAuth = Object.keys(authRecords).filter(isGatewayProviderId).sort()
  await Promise.all(removedAuth.map((providerId) => input.auth.remove(providerId)))

  const config = await input.config.getGlobal()
  const removedProviders = Object.keys(config.provider ?? {}).filter(isGatewayProviderId).sort()
  await input.config.updateGlobal({
    provider: Object.fromEntries(removedProviders.map((providerId) => [providerId, undefined])),
  })

  return { removedAuth, removedProviders }
}

export async function getGatewayStatus(input: { auth: GatewayAuthStore; baseUrl?: string; config: GatewayConfigStore }) {
  const authRecords = await input.auth.all()
  const config = await input.config.getGlobal()
  const loginURL = normalizeGatewayURL(input.baseUrl)
  const login = authRecords[loginURL]

  return {
    loggedIn: login?.type === "wellknown" && login.token.length > 0,
    loginURL,
    managedProviders: Object.entries(config.provider ?? {})
      .filter((entry) => isGatewayProviderId(entry[0]) && entry[1])
      .map((entry) => ({
        id: entry[0],
        name: providerName(entry[0], entry[1]),
        authenticated: Boolean(authRecords[entry[0]]),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
}

export function buildGatewayProviderSyncName(group: GatewayGroup) {
  return `${Brand.product} ${group.name?.trim() || group.platform?.trim() || "Platform"}`
}

export function filterSyncableGroups(groups: GatewayGroup[]) {
  return groups
    .filter((group) => group.status === "active")
    .filter((group) => group.id !== undefined && Boolean(group.platform?.trim()))
    .map((group) => ({
      group,
      providerId: createGatewayProviderId(group.platform ?? ""),
      providerName: buildGatewayProviderSyncName(group),
    }))
}

export function summarizeProviderSync(input: {
  failures: GatewayProviderSyncFailure[]
  providers: GatewayProviderSyncResult[]
}) {
  return {
    providerCount: input.providers.length,
    modelCount: input.providers.reduce((total, provider) => total + provider.modelCount, 0),
    failedCount: input.failures.length,
  }
}

async function syncGatewayGroup(input: GatewaySyncInput & {
  baseUrl: string
  group: ReturnType<typeof filterSyncableGroups>[number]
  token: string
}) {
  try {
    const apiKey = await getOrCreateApiKeyForGroup({
      baseUrl: input.baseUrl,
      fetch: input.fetch,
      groupId: input.group.group.id!,
      name: input.group.providerName,
      token: input.token,
    })
    if (!apiKey.key) throw new Error(`Gateway API key was not returned for ${input.group.providerName}`)

    const models = await listModels({
      apiKey: apiKey.key,
      baseUrl: input.baseUrl,
      fetch: input.fetch,
    })
    await input.auth.set(input.group.providerId, { type: "api", key: apiKey.key })

    return {
      type: "synced" as const,
      provider: {
        providerId: input.group.providerId,
        providerName: input.group.providerName,
        modelCount: Object.keys(models).length,
      },
      config: buildGatewayProviderConfig({
        baseUrl: input.baseUrl,
        name: input.group.providerName,
        models,
      }),
    }
  } catch (error) {
    return {
      type: "failed" as const,
      failure: {
        providerId: input.group.providerId,
        label: input.group.providerName,
        reason: errorMessage(error),
      },
    }
  }
}

async function writeProviderConfig(input: {
  config: GatewayConfigStore
  providerConfigs: Record<string, GatewayProviderConfig>
  syncableProviderIds: Set<string>
}) {
  const config = await input.config.getGlobal()
  const staleProviders = Object.keys(config.provider ?? {}).filter(
    (providerId) => isGatewayProviderId(providerId) && !input.syncableProviderIds.has(providerId),
  )
  await input.config.updateGlobal({
    provider: {
      ...Object.fromEntries(staleProviders.map((providerId) => [providerId, undefined])),
      [LEGACY_GATEWAY_PROVIDER_ID]: undefined,
      ...input.providerConfigs,
    },
  })
}

async function removeStaleProviderAuth(input: { auth: GatewayAuthStore; syncableProviderIds: Set<string> }) {
  const authRecords = await input.auth.all()
  const staleAuth = Object.keys(authRecords).filter(
    (providerId) => isGatewayProviderId(providerId) && !input.syncableProviderIds.has(providerId),
  )
  await Promise.all(staleAuth.map((providerId) => input.auth.remove(providerId)))
}

async function getStoredGatewayToken(auth: GatewayAuthStore, baseUrl: string) {
  const records = await auth.all()
  const entry = records[baseUrl]
  if (entry?.type === "wellknown") return entry.token
  return undefined
}

function providerName(providerId: string, provider: unknown) {
  if (isRecord(provider) && typeof provider.name === "string" && provider.name.length > 0) return provider.name
  return providerId
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function isSub2APIKey(token: string) {
  return token.startsWith("sk-")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
