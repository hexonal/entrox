import { InstallationVersion } from "@opencode-ai/core/installation/version"
import semver from "semver"

export const UPDATE_AVAILABLE_VERSION_KEY = "update_available_version"
export const UPDATE_SKIPPED_VERSION_KEY = "skipped_version"

export function isUpdateNewerThan(version: string, baseline: string) {
  const target = semver.valid(version)
  const current = semver.valid(baseline)
  if (target && current) return semver.gt(target, current)
  return version !== baseline
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
