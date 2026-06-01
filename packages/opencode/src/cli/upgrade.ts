import { Config } from "@/config/config"
import { AppRuntime } from "@/effect/app-runtime"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Installation } from "@/installation"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { GlobalBus } from "@/bus/global"
import { Global } from "@opencode-ai/core/global"
import { Filesystem } from "@/util/filesystem"
import { Brand } from "@/brand"
import path from "path"
import semver from "semver"

const CHECK_INTERVAL = 6 * 60 * 60 * 1000
const CACHE_FILE = path.join(Global.Path.state, "update-check.json")

type UpdateCheckCache = {
  checkedAt?: number
  latest?: string
}

async function readCache(): Promise<UpdateCheckCache> {
  return Filesystem.readJson<UpdateCheckCache>(CACHE_FILE).catch(() => ({}))
}

async function writeCache(latest?: string): Promise<void> {
  await Filesystem.writeJson(CACHE_FILE, { checkedAt: Date.now(), latest }, 0o600).catch(() => undefined)
}

function isNewer(latest: string): boolean {
  const current = semver.valid(InstallationVersion)
  const target = semver.valid(latest)
  if (current && target) return semver.gt(target, current)
  return InstallationVersion !== latest
}

function releaseType(latest: string): Installation.ReleaseType {
  const current = semver.valid(InstallationVersion)
  const target = semver.valid(latest)
  if (!current || !target) return "major"
  return Installation.getReleaseType(current, target)
}

async function latestWithCache(method?: Installation.Method): Promise<string | undefined> {
  const cache = await readCache()
  const cachedLatest = typeof cache.latest === "string" ? cache.latest : undefined
  const checkedAt = typeof cache.checkedAt === "number" ? cache.checkedAt : 0

  if (!Flag.OPENCODE_ALWAYS_NOTIFY_UPDATE && checkedAt > 0 && Date.now() - checkedAt < CHECK_INTERVAL) {
    return cachedLatest
  }

  const latest = await (method ? Installation.latest(method) : Installation.latest()).catch(() => undefined)
  await writeCache(latest ?? cachedLatest)
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
