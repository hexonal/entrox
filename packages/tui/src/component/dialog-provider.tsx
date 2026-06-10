import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useSync } from "../context/sync"
import { map, pipe } from "remeda"
import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import type { ProviderAuthAuthorization, ProviderAuthMethod } from "@opencode-ai/sdk/v2"
import { DialogModel } from "./dialog-model"
import { useToast } from "../ui/toast"
import { Spinner } from "./spinner"
import { isConsoleManagedProvider } from "../util/provider-origin"
import { useConnected } from "./use-connected"
import { useBindings } from "../keymap"
import { useClipboard } from "../context/clipboard"
import { Brand } from "../brand"
import { errorMessage } from "../util/error"

const WELL_KNOWN_PROVIDER_OPTION_VALUE = "__entrox_wellknown_provider__"

type WellKnownMetadata = {
  auth: {
    command: string[]
    env: string
  }
}

type ProviderOptionBase = {
  title: string
  value: string
  description?: string
  category: string
}

type ProviderOption =
  | (ProviderOptionBase & {
      type: "provider"
      providerID: string
    })
  | (ProviderOptionBase & {
      type: "well-known"
    })

export type LoginAction = "keep" | "replace"

export function credentialDisplayName(key: string, bundledURL = Brand.authProviderURL) {
  return normalizeWellKnownProviderURL(key) === normalizeWellKnownProviderURL(bundledURL) ? Brand.product : key
}

export function loginActionOptions(hasExisting: boolean): Array<{ label: string; value: LoginAction }> {
  if (!hasExisting) return []
  return [
    { label: `Use existing ${Brand.product} login`, value: "keep" },
    { label: "Log in again", value: "replace" },
  ]
}

export function isBrowserLoginProviderID(providerID: string) {
  return (
    providerID === Brand.command ||
    providerID.startsWith(`${Brand.command}-`) ||
    providerID === Brand.legacyCommand ||
    providerID.startsWith(`${Brand.legacyCommand}-`)
  )
}

export function hasBrowserLoginConnection(connected: readonly string[]) {
  const bundledURL = normalizeWellKnownProviderURL(Brand.authProviderURL)
  return connected.some((providerID) => {
    if (isBrowserLoginProviderID(providerID)) return true
    return normalizeWellKnownProviderURL(providerID) === bundledURL
  })
}

export function providerOptions(list: { id: string; name: string }[]): ProviderOption[] {
  const configured = Brand.showConfiguredProvidersInConnectDialog
    ? [...list]
        .filter((provider) => !isBrowserLoginProviderID(provider.id) && provider.id !== "other")
        .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
        .map(
          (provider): ProviderOption => ({
            type: "provider",
            providerID: provider.id,
            title: provider.name || provider.id,
            value: provider.id,
            category: "Configured",
          }),
        )
    : []

  return [
    {
      type: "well-known",
      title: Brand.product,
      value: WELL_KNOWN_PROVIDER_OPTION_VALUE,
      description: "Browser login",
      category: "Provider",
    },
    ...configured,
  ]
}

export function configuredProviderOptions(
  all: { id: string; name: string }[],
  connected: readonly string[],
): ProviderOption[] {
  if (!Brand.showConfiguredProvidersInConnectDialog) return providerOptions([])

  const connectedIDs = new Set(connected)
  return providerOptions(all.filter((provider) => connectedIDs.has(provider.id)))
}

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const { theme } = useTheme()
  const onboarded = useConnected()

  function promptWellKnownProviderURL() {
    dialog.replace(() => <WellKnownMethod url={Brand.authProviderURL} />)
  }

  const options = createMemo(() => {
    return pipe(
      configuredProviderOptions(sync.data.provider_next.all, sync.data.provider_next.connected),
      map((provider) => {
        if (provider.type === "well-known") {
          const connected = hasBrowserLoginConnection(sync.data.provider_next.connected)
          return {
            title: provider.title,
            value: provider.value,
            description: provider.description,
            category: provider.category,
            gutter: connected && onboarded() ? () => <text fg={theme.success}>✓</text> : undefined,
            async onSelect() {
              promptWellKnownProviderURL()
            },
          }
        }

        const providerID = provider.providerID
        const consoleManaged = isConsoleManagedProvider(sync.data.console_state.consoleManagedProviders, providerID)
        const connected = sync.data.provider_next.connected.includes(providerID)

        return {
          title: provider.title,
          value: provider.value,
          description: provider.description,
          footer: consoleManaged ? sync.data.console_state.activeOrgName : undefined,
          category: provider.category,
          gutter: connected && onboarded() ? () => <text fg={theme.success}>✓</text> : undefined,
          async onSelect() {
            if (consoleManaged) return

            const methods = sync.data.provider_auth[providerID] ?? [
              {
                type: "api",
                label: "API key",
              },
            ]
            let index: number | null = 0
            if (methods.length > 1) {
              index = await new Promise<number | null>((resolve) => {
                dialog.replace(
                  () => (
                    <DialogSelect
                      title="Select auth method"
                      options={methods.map((x, index) => ({
                        title: x.label,
                        value: index,
                      }))}
                      onSelect={(option) => resolve(option.value)}
                    />
                  ),
                  () => resolve(null),
                )
              })
            }
            if (index == null) return
            const method = methods[index]
            if (method.type === "oauth") {
              let inputs: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({
                  dialog,
                  prompts: method.prompts,
                })
                if (!value) return
                inputs = value
              }

              const result = await sdk.client.provider.oauth.authorize({
                providerID,
                method: index,
                inputs,
              })
              if (result.error) {
                toast.show({
                  variant: "error",
                  message: JSON.stringify(result.error),
                })
                dialog.clear()
                return
              }
              if (result.data?.method === "code") {
                dialog.replace(() => (
                  <CodeMethod providerID={providerID} title={method.label} index={index} authorization={result.data!} />
                ))
              }
              if (result.data?.method === "auto") {
                dialog.replace(() => (
                  <AutoMethod providerID={providerID} title={method.label} index={index} authorization={result.data!} />
                ))
              }
            }
            if (method.type === "api") {
              let metadata: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({ dialog, prompts: method.prompts })
                if (!value) return
                metadata = value
              }
              return dialog.replace(() => (
                <ApiMethod providerID={providerID} title={method.label} metadata={metadata} />
              ))
            }
          },
        }
      }),
    )
  })
  return options
}

export function DialogProvider() {
  const options = createDialogProviderOptions()
  return <DialogSelect title="Connect Entrox" options={options()} />
}

export function normalizeWellKnownProviderURL(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed) return

  try {
    const url = new URL(trimmed)
    if (!["http:", "https:"].includes(url.protocol)) return
    url.pathname = url.pathname.replace(/\/+$/, "")
    return url.toString().replace(/\/+$/, "")
  } catch {
    return
  }
}

function isWellKnownMetadata(value: unknown): value is WellKnownMetadata {
  if (!value || typeof value !== "object") return false
  if (!("auth" in value) || !value.auth || typeof value.auth !== "object") return false
  const auth = value.auth as Record<string, unknown>
  return (
    Array.isArray(auth.command) &&
    auth.command.every((item) => typeof item === "string") &&
    typeof auth.env === "string"
  )
}

async function runText(command: string[]) {
  if (command.length === 0) throw new Error("Authorization command is empty")
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "inherit" })
  const [code, text] = await Promise.all([proc.exited, new Response(proc.stdout).text()])
  if (code !== 0) throw new Error(`Authorization command failed with code ${code}`)
  return text
}

function WellKnownMethod(props: { url: string }) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()
  const { theme } = useTheme()

  async function login() {
    const url = normalizeWellKnownProviderURL(props.url)
    if (!url) {
      toast.show({ variant: "error", message: "Enter a valid http or https provider URL" })
      dialog.clear()
      return
    }

    try {
      const existing = hasBrowserLoginConnection(sync.data.provider_next.connected)
      if (existing) {
        toast.show({ variant: "success", message: `Using existing ${credentialDisplayName(url)}` })
        dialog.replace(() => <DialogModel />)
        return
      }

      const response = await fetch(`${url}${Brand.wellKnownPath}`)
      if (!response.ok) throw new Error(`Metadata request failed with HTTP ${response.status}`)
      const metadata: unknown = await response.json()
      if (!isWellKnownMetadata(metadata)) throw new Error("Metadata response is missing auth.command or auth.env")

      toast.show({ variant: "info", message: "Opening browser authorization" })
      const token = (await runText(metadata.auth.command)).trim()
      if (!token) throw new Error("Authorization command did not return a token")

      const saved = await sdk.fetch(new URL(`/auth/${encodeURIComponent(url)}`, sdk.url), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "wellknown",
          key: metadata.auth.env,
          token,
        }),
      })
      if (!saved.ok) {
        const message = await saved.text().catch(() => "")
        throw new Error(message || `Failed to save credential with HTTP ${saved.status}`)
      }

      await sdk.client.instance.dispose()
      await sync.bootstrap()
      toast.show({ variant: "success", message: `Logged into ${url}` })
      dialog.replace(() => <DialogModel />)
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
      dialog.clear()
    }
  }

  onMount(() => {
    void login()
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {Brand.product} login
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <Spinner color={theme.textMuted}>Waiting for browser authorization...</Spinner>
    </box>
  )
}

interface AutoMethodProps {
  index: number
  providerID: string
  title: string
  authorization: ProviderAuthAuthorization
}
function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()
  const toast = useToast()
  const clipboard = useClipboard()

  useBindings(() => ({
    bindings: [
      {
        key: "c",
        desc: "Copy provider code",
        group: "Dialog",
        cmd: () => {
          const code =
            props.authorization.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0] ?? props.authorization.url
          const write = clipboard.write
          if (!write) return
          write(code)
            .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
            .catch(toast.error)
        },
      },
    ],
  }))

  onMount(async () => {
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      toast.show({
        variant: "error",
        message:
          "name" in result.error && result.error.name === "ProviderAuthOauthCallbackFailed"
            ? "OAuth authorization failed. Try /connect again."
            : JSON.stringify(result.error),
      })
      dialog.clear()
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box gap={1}>
        <Link href={props.authorization.url} fg={theme.primary} />
        <text fg={theme.textMuted}>{props.authorization.instructions}</text>
      </box>
      <text fg={theme.textMuted}>Waiting for authorization...</text>
      <text fg={theme.text}>
        c <span style={{ fg: theme.textMuted }}>copy</span>
      </text>
    </box>
  )
}

interface CodeMethodProps {
  index: number
  title: string
  providerID: string
  authorization: ProviderAuthAuthorization
}
function CodeMethod(props: CodeMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const [error, setError] = createSignal(false)

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const { error } = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!error) {
          await sdk.client.instance.dispose()
          await sync.bootstrap()
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
          return
        }
        setError(true)
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>
            <text fg={theme.error}>Invalid code</text>
          </Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
  metadata?: Record<string, string>
  custom?: boolean
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()
  const { theme } = useTheme()

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      description={
        {
          opencode: (
            <text fg={theme.textMuted}>
              {Brand.product} gives you access to supported coding models with a single API key.
            </text>
          ),
          "opencode-go": (
            <text fg={theme.textMuted}>
              {Brand.product} Go provides reliable access to popular open coding models with generous usage limits.
            </text>
          ),
        }[props.providerID] ?? undefined
      }
      onConfirm={async (value) => {
        if (!value) return
        await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
            ...(props.metadata ? { metadata: props.metadata } : {}),
          },
        })
        await sdk.client.instance.dispose()
        await sync.bootstrap()
        if (props.custom && !sync.data.provider_next.all.some((provider) => provider.id === props.providerID)) {
          toast.show({
            variant: "info",
            message: `Saved credential for ${props.providerID}. Configure it in ${Brand.configBase}.json to use it.`,
          })
          dialog.clear()
          return
        }
        dialog.replace(() => <DialogModel providerID={props.providerID} />)
      }}
    />
  )
}

interface PromptsMethodProps {
  dialog: ReturnType<typeof useDialog>
  prompts: NonNullable<ProviderAuthMethod["prompts"]>[number][]
}
async function PromptsMethod(props: PromptsMethodProps) {
  const inputs: Record<string, string> = {}
  for (const prompt of props.prompts) {
    if (prompt.when) {
      const value = inputs[prompt.when.key]
      if (value === undefined) continue
      const matches = prompt.when.op === "eq" ? value === prompt.when.value : value !== prompt.when.value
      if (!matches) continue
    }

    if (prompt.type === "select") {
      const value = await new Promise<string | null>((resolve) => {
        props.dialog.replace(
          () => (
            <DialogSelect
              title={prompt.message}
              options={prompt.options.map((x) => ({
                title: x.label,
                value: x.value,
                description: x.hint,
              }))}
              onSelect={(option) => resolve(option.value)}
            />
          ),
          () => resolve(null),
        )
      })
      if (value === null) return null
      inputs[prompt.key] = value
      continue
    }

    const value = await new Promise<string | null>((resolve) => {
      props.dialog.replace(
        () => (
          <DialogPrompt title={prompt.message} placeholder={prompt.placeholder} onConfirm={(value) => resolve(value)} />
        ),
        () => resolve(null),
      )
    })
    if (value === null) return null
    inputs[prompt.key] = value
  }
  return inputs
}
