export * as ConfigPaths from "./paths"

import path from "path"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"
import { unique } from "remeda"
import * as Effect from "effect/Effect"
import { AppFileSystem } from "@opencode-ai/core/filesystem"

export const files = Effect.fn("ConfigPaths.projectFiles")(function* (
  name: string,
  directory: string,
  worktree?: string,
) {
  const afs = yield* AppFileSystem.Service
  return (yield* afs.up({
    targets: projectTargets(name),
    start: directory,
    stop: worktree,
  })).toReversed()
})

export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* AppFileSystem.Service
  return unique([
    Global.Path.config,
    Global.LegacyPath.config,
    ...(!Flag.OPENCODE_DISABLE_PROJECT_CONFIG
      ? yield* afs.up({
          targets: [".entrox", ".opencode"],
          start: directory,
          stop: worktree,
        })
      : []),
    ...(yield* afs.up({
      targets: [".entrox", ".opencode"],
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
  return [".entrox", ".opencode"]
}

export function isProjectDirectory(dir: string) {
  return projectDirectoryNames().some((name) => dir.endsWith(name))
}

function fileNames(name: string) {
  if (name === "opencode") return ["entrox.json", "entrox.jsonc", "opencode.json", "opencode.jsonc"]
  return [`${name}.json`, `${name}.jsonc`]
}

function projectTargets(name: string) {
  if (name === "opencode") return ["entrox.jsonc", "entrox.json", "opencode.jsonc", "opencode.json"]
  return [`${name}.jsonc`, `${name}.json`]
}
