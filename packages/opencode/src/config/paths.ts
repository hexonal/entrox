export * as ConfigPaths from "./paths"

import path from "path"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"
import { unique } from "remeda"
import * as Effect from "effect/Effect"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Brand } from "@/brand"

export const files = Effect.fn("ConfigPaths.projectFiles")(function* (
  name: string,
  directory: string,
  worktree?: string,
) {
  const afs = yield* FSUtil.Service
  return (yield* afs.up({
    targets: projectTargets(name),
    start: directory,
    stop: worktree,
  })).toReversed()
})

export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* FSUtil.Service
  return unique([
    Global.Path.config,
    Global.LegacyPath.config,
    ...(!Flag.OPENCODE_DISABLE_PROJECT_CONFIG
      ? yield* afs.up({
          targets: [Brand.projectDirectory, Brand.legacyProjectDirectory],
          start: directory,
          stop: worktree,
        })
      : []),
    ...(yield* afs.up({
      targets: [Brand.projectDirectory, Brand.legacyProjectDirectory],
      start: Global.Path.home,
      stop: Global.Path.home,
    })),
    ...(Flag.ENTROX_CONFIG_DIR ? [Flag.ENTROX_CONFIG_DIR] : []),
    ...(Flag.OPENCODE_CONFIG_DIR ? [Flag.OPENCODE_CONFIG_DIR] : []),
  ])
})

export function fileInDirectory(dir: string, name: string) {
  return fileNames(name).map((file) => path.join(dir, file))
}

export function projectDirectoryNames() {
  return [Brand.projectDirectory, Brand.legacyProjectDirectory]
}

export function isProjectDirectory(dir: string) {
  return projectDirectoryNames().some((name) => dir.endsWith(name))
}

function fileNames(name: string) {
  if (name === Brand.legacyConfigBase)
    return [
      `${Brand.configBase}.json`,
      `${Brand.configBase}.jsonc`,
      `${Brand.legacyConfigBase}.json`,
      `${Brand.legacyConfigBase}.jsonc`,
    ]
  return [`${name}.json`, `${name}.jsonc`]
}

function projectTargets(name: string) {
  if (name === Brand.legacyConfigBase)
    return [
      `${Brand.configBase}.jsonc`,
      `${Brand.configBase}.json`,
      `${Brand.legacyConfigBase}.jsonc`,
      `${Brand.legacyConfigBase}.json`,
    ]
  return [`${name}.jsonc`, `${name}.json`]
}
