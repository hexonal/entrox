import { Brand } from "@/brand"

export const DEFAULT_GATEWAY_URL = Brand.authProviderURL
export const DEFAULT_GATEWAY_OPENAI_BASE_URL = `${DEFAULT_GATEWAY_URL}/v1`
export const LEGACY_GATEWAY_PROVIDER_ID = "sub2api"
export const GATEWAY_PROVIDER_PREFIX = "entro-"

export const GATEWAY_ENDPOINTS = {
  apiKeys: "/api/v1/keys",
  groups: "/api/v1/groups/available",
  models: "/v1/models",
} as const

export type GatewayFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type GatewayModelConfig = {
  name: string
  release_date?: string
}

export type GatewayModelsRecord = Record<string, GatewayModelConfig>

export type GatewayProviderConfig = {
  npm: "@ai-sdk/openai-compatible"
  name: string
  options: {
    baseURL: string
  }
  models: GatewayModelsRecord
}

export type BuildGatewayProviderConfigInput = {
  baseUrl?: string
  name?: string
  models: GatewayModelsRecord
}

export type GatewayAuthInput = {
  apiKey?: string
  baseUrl?: string
  fetch?: GatewayFetch
  token?: string
}

export type GatewayApiKey = {
  id?: string | number
  key?: string
  name?: string
  groupId?: string | number
  raw: unknown
}

export type GatewayGroup = {
  id?: string | number
  name?: string
  platform?: string
  status?: string
  raw: unknown
}

export type CreateGatewayApiKeyInput = GatewayAuthInput & {
  expiresInDays?: number
  groupId?: string | number
  name?: string
  quota?: number
}

export class Sub2ApiError extends Error {
  readonly details?: unknown
  readonly status: number

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = "Sub2ApiError"
    this.status = status
    this.details = details
  }
}

export function normalizeGatewayURL(baseUrl?: string) {
  const raw = (baseUrl?.trim() || DEFAULT_GATEWAY_URL).replace(/\/+$/, "")
  return raw.replace(/\/api\/v1$/i, "").replace(/\/v1$/i, "")
}

export function createGatewayProviderId(platform: string) {
  return `${GATEWAY_PROVIDER_PREFIX}${slugifyPlatform(platform) || "platform"}`
}

export function isGatewayProviderId(providerId: string) {
  return providerId === LEGACY_GATEWAY_PROVIDER_ID || /^entro-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(providerId)
}

export function buildGatewayProviderConfig(input: BuildGatewayProviderConfigInput): GatewayProviderConfig {
  return {
    npm: "@ai-sdk/openai-compatible",
    name: input.name ?? Brand.product,
    options: {
      baseURL: joinURL(normalizeGatewayURL(input.baseUrl), "/v1"),
    },
    models: input.models,
  }
}

export async function listApiKeys(input: GatewayAuthInput) {
  return normalizeList(await gatewayRequest(input, GATEWAY_ENDPOINTS.apiKeys)).map(normalizeApiKey)
}

export async function createApiKey(input: CreateGatewayApiKeyInput) {
  return normalizeApiKey(
    await gatewayRequest(input, GATEWAY_ENDPOINTS.apiKeys, {
      method: "POST",
      body: JSON.stringify(
        Object.fromEntries(
          Object.entries({
            name: input.name,
            group_id: input.groupId,
            quota: input.quota,
            expires_in_days: input.expiresInDays,
          }).filter((entry) => entry[1] !== undefined),
        ),
      ),
    }),
  )
}

export async function getOrCreateApiKeyForGroup(input: GatewayAuthInput & { groupId: string | number; name?: string }) {
  return (
    (await listApiKeys(input)).find((apiKey) => apiKey.key && String(apiKey.groupId) === String(input.groupId)) ??
    createApiKey({ ...input, name: input.name ?? Brand.product })
  )
}

export async function listAvailableGroups(input: GatewayAuthInput) {
  return normalizeList(await gatewayRequest(input, GATEWAY_ENDPOINTS.groups)).map(normalizeGroup)
}

export async function listModels(input: GatewayAuthInput) {
  return normalizeModels(await gatewayRequest(input, GATEWAY_ENDPOINTS.models))
}

async function gatewayRequest(input: GatewayAuthInput, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set("accept", "application/json")

  if (init.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json")
  if (input.apiKey) headers.set("authorization", `Bearer ${input.apiKey}`)
  if (!input.apiKey && input.token) headers.set("authorization", `Bearer ${input.token}`)

  const response = await (input.fetch ?? fetch)(joinURL(normalizeGatewayURL(input.baseUrl), path), {
    ...init,
    headers,
  })
  const body = await parseResponseBody(response)

  if (!response.ok) {
    throw new Sub2ApiError(response.status, normalizeErrorMessage(body, response), body)
  }

  return body
}

async function parseResponseBody(response: Response) {
  const text = await response.text()
  if (text.length === 0) return undefined

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function normalizeErrorMessage(body: unknown, response: Response) {
  if (typeof body === "string" && body.length > 0) return body

  if (!isRecord(body)) return response.statusText || `Sub2API request failed with status ${response.status}`

  return (
    ["message", "error", "msg", "detail"]
      .map((key) => body[key])
      .map((value) => {
        if (typeof value === "string" && value.length > 0) return value
        if (isRecord(value) && typeof value.message === "string") return value.message
        return undefined
      })
      .find((message) => message) ?? response.statusText ?? `Sub2API request failed with status ${response.status}`
  )
}

function normalizeModels(payload: unknown): GatewayModelsRecord {
  const list = normalizeList(payload)
  if (list.length > 0) return Object.fromEntries(list.flatMap((item) => {
    const entry = modelEntry(item)
    return entry ? [entry] : []
  }))

  if (!isRecord(payload)) return {}

  return Object.fromEntries(
    Object.entries(normalizeObject(payload.models ?? payload.data ?? payload.result)).map((entry) => [
      entry[0],
      normalizeModelConfig(entry[0], entry[1]),
    ]),
  )
}

function modelEntry(item: unknown): [string, GatewayModelConfig] | undefined {
  const id = normalizeModelId(item)
  if (!id) return undefined
  return [id, normalizeModelConfig(id, item)]
}

function normalizeModelId(item: unknown) {
  if (typeof item === "string") return item
  if (!isRecord(item)) return undefined

  return ["id", "model", "name"]
    .map((key) => item[key])
    .find((value): value is string => typeof value === "string" && value.length > 0)
}

function normalizeModelConfig(id: string, item: unknown): GatewayModelConfig {
  if (!isRecord(item)) return { name: id }

  const releaseDate = stringFrom(item.release_date) ?? stringFrom(item.releaseDate) ?? dateFromUnixSeconds(item.created)
  return {
    name: stringFrom(item.name) ?? stringFrom(item.display_name) ?? stringFrom(item.displayName) ?? id,
    ...(releaseDate ? { release_date: releaseDate } : {}),
  }
}

function normalizeApiKey(payload: unknown): GatewayApiKey {
  const source = normalizeObject(payload)
  return {
    id: stringOrNumberFrom(source.id ?? source.key_id),
    key: stringFrom(source.key ?? source.token ?? source.api_key ?? source.apiKey),
    name: stringFrom(source.name),
    groupId: stringOrNumberFrom(source.group_id ?? source.groupId),
    raw: payload,
  }
}

function normalizeGroup(payload: unknown): GatewayGroup {
  const source = normalizeObject(payload)
  return {
    id: stringOrNumberFrom(source.id),
    name: stringFrom(source.name),
    platform: stringFrom(source.platform),
    status: stringFrom(source.status),
    raw: payload,
  }
}

function normalizeList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  return ["data", "result", "list", "items", "models", "tokens"].flatMap((key) => {
    const value = payload[key]
    if (Array.isArray(value)) return value
    return normalizeList(value)
  })
}

function normalizeObject(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {}
  const nested = [payload.data, payload.result].find(isRecord)
  return nested ?? payload
}

function slugifyPlatform(platform: string) {
  return platform
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function dateFromUnixSeconds(value: unknown) {
  const seconds = normalizeNumber(value)
  if (!seconds) return undefined

  const timestamp = seconds * 1000
  if (!Number.isFinite(timestamp)) return undefined

  return new Date(timestamp).toISOString().slice(0, 10)
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string" || value.trim().length === 0) return undefined

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function stringOrNumberFrom(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number") return value
  return undefined
}

function joinURL(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
