import { Global } from "@opencode-ai/core/global"
import { Filesystem } from "@/util/filesystem"
import path from "path"

export type UpdateCheckCache = {
  checkedAt?: number
  latest?: string
}

const UPDATE_CHECK_CACHE_FILE = path.join(Global.Path.state, "update-check.json")

export async function readUpdateCheckCache(): Promise<UpdateCheckCache> {
  return Filesystem.readJson<UpdateCheckCache>(UPDATE_CHECK_CACHE_FILE).catch(() => ({}))
}

export async function writeUpdateCheckCache(latest?: string): Promise<void> {
  await Filesystem.writeJson(UPDATE_CHECK_CACHE_FILE, { checkedAt: Date.now(), latest }, 0o600).catch(
    () => undefined,
  )
}
