import { InstallationVersion } from "@opencode-ai/core/installation/version"

export const UPDATE_AVAILABLE_VERSION_KEY = "update_available_version"
export const UPDATE_SKIPPED_VERSION_KEY = "skipped_version"

export function isUpdateNewerThan(version: string, baseline: string) {
  const parse = (value: string) => {
    const [core, prerelease] = value.replace(/^v/, "").split("-", 2)
    return { core: core.split(".").map((part) => Number.parseInt(part, 10) || 0), prerelease }
  }
  const target = parse(version)
  const current = parse(baseline)
  for (let index = 0; index < Math.max(target.core.length, current.core.length); index++) {
    const difference = (target.core[index] ?? 0) - (current.core[index] ?? 0)
    if (difference) return difference > 0
  }
  if (target.prerelease === current.prerelease) return false
  if (!target.prerelease) return true
  if (!current.prerelease) return false
  return target.prerelease.localeCompare(current.prerelease, undefined, { numeric: true }) > 0
}

export function isUpdateNewerThanCurrent(version: string | undefined): version is string {
  if (!version) return false
  return isUpdateNewerThan(version, InstallationVersion)
}

export function updateNoticeVersion(version: string | undefined, skippedVersion?: string): string | undefined {
  if (!isUpdateNewerThanCurrent(version)) return undefined
  if (skippedVersion && !isUpdateNewerThan(version, skippedVersion)) return undefined
  return version
}
