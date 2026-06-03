import { Config } from "@/config/config"
import { AppRuntime } from "@/effect/app-runtime"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Installation } from "@/installation"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { GlobalBus } from "@/bus/global"
import { Brand } from "@/brand"
import { readUpdateCheckCache, writeUpdateCheckCache } from "@/cli/update-check-cache"
import semver from "semver"

const CHECK_INTERVAL = 6 * 60 * 60 * 1000
const ENTROX_NO_UPDATE_CHECK_INTERVAL = 5 * 60 * 1000

function isVersionNewer(latest: string | undefined, currentVersion: string): boolean {
  if (!latest) return false
  const current = semver.valid(currentVersion)
  const target = semver.valid(latest)
  if (current && target) return semver.gt(target, current)
  return currentVersion !== latest
}

function isNewer(latest: string): boolean {
  return isVersionNewer(latest, InstallationVersion)
}

export function shouldUseCachedLatest(input: {
  command: string
  checkedAt: number
  now: number
  cachedLatest?: string
  currentVersion: string
  alwaysNotify?: boolean
}): boolean {
  if (input.alwaysNotify || input.checkedAt <= 0) return false

  // Entrox dev releases are frequent, so refresh no-update caches quickly.
  const interval =
    input.command === "entrox" && !isVersionNewer(input.cachedLatest, input.currentVersion)
      ? ENTROX_NO_UPDATE_CHECK_INTERVAL
      : CHECK_INTERVAL

  return input.now - input.checkedAt < interval
}

function releaseType(latest: string): Installation.ReleaseType {
  const current = semver.valid(InstallationVersion)
  const target = semver.valid(latest)
  if (!current || !target) return "major"
  return Installation.getReleaseType(current, target)
}

async function latestWithCache(method?: Installation.Method): Promise<string | undefined> {
  const cache = await readUpdateCheckCache()
  const cachedLatest = typeof cache.latest === "string" ? cache.latest : undefined
  const checkedAt = typeof cache.checkedAt === "number" ? cache.checkedAt : 0

  if (
    shouldUseCachedLatest({
      command: Brand.command,
      checkedAt,
      now: Date.now(),
      cachedLatest,
      currentVersion: InstallationVersion,
      alwaysNotify: Flag.OPENCODE_ALWAYS_NOTIFY_UPDATE,
    })
  ) {
    return cachedLatest
  }

  const latest = await (method ? Installation.latest(method) : Installation.latest()).catch(() => undefined)
  await writeUpdateCheckCache(latest ?? cachedLatest)
  return latest ?? cachedLatest
}

export async function upgrade() {
  const config = await AppRuntime.runPromise(Config.Service.use((cfg) => cfg.getGlobal()))
  if (config.autoupdate === false || Flag.OPENCODE_DISABLE_AUTOUPDATE) return
  const latestMethod = Brand.command === "entrox" ? "unknown" : undefined
  const latest = await latestWithCache(latestMethod)
  if (!latest) return

  if (Flag.OPENCODE_ALWAYS_NOTIFY_UPDATE) {
    GlobalBus.emit("event", {
      directory: "global",
      payload: {
        type: Installation.Event.UpdateAvailable.type,
        properties: { version: latest },
      },
    })
    return
  }

  if (!isNewer(latest)) return

  const kind = releaseType(latest)

  if (Brand.command === "entrox" || config.autoupdate === "notify" || kind !== "patch") {
    GlobalBus.emit("event", {
      directory: "global",
      payload: {
        type: Installation.Event.UpdateAvailable.type,
        properties: { version: latest },
      },
    })
    return
  }

  const method = await Installation.method()
  if (method === "unknown") return
  await Installation.upgrade(method, latest)
    .then(() =>
      GlobalBus.emit("event", {
        directory: "global",
        payload: {
          type: Installation.Event.Updated.type,
          properties: { version: latest },
        },
      }),
    )
    .catch(() => {})
}
