import { Effect } from "effect"
import { Brand } from "@/brand"
import { Process } from "@/util/process"
import { effectCmd } from "../effect-cmd"

type ReviewArgs = {
  target?: string
  model?: string
  format?: "default" | "json"
  uncommitted?: boolean
}

export function buildReviewRunArgs(input: ReviewArgs) {
  const args = ["run", "--command", "review"]
  if (input.model) args.push("--model", input.model)
  if (input.format) args.push("--format", input.format)
  const target = input.uncommitted ? undefined : (input.target ?? "origin/dev")
  if (target) args.push(target)
  return args
}

function cliCommand(args: string[]) {
  const entry = process.argv[1]
  if (entry?.endsWith("src/index.ts")) return ["bun", "run", "--conditions=browser", entry, ...args]
  if (entry) return [entry, ...args]
  return [Brand.command, ...args]
}

export const ReviewCommand = effectCmd({
  command: "review [target]",
  describe: "review code changes",
  instance: false,
  builder: (yargs) =>
    yargs
      .positional("target", {
        describe: "base branch, commit, PR URL, or PR number; defaults to origin/dev",
        type: "string",
      })
      .option("uncommitted", {
        describe: "review only current uncommitted changes",
        type: "boolean",
      })
      .option("model", {
        alias: ["m"],
        describe: "model to use in the format of provider/model",
        type: "string",
      })
      .option("format", {
        describe: "format: default (formatted) or json (raw JSON events)",
        choices: ["default", "json"] as const,
        default: "default" as const,
      }),
  handler: Effect.fn("Cli.review")(function* (args) {
    const code = yield* Effect.promise(
      () =>
        Process.spawn(cliCommand(buildReviewRunArgs(args)), {
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
          cwd: process.cwd(),
        }).exited,
    )
    if (code !== 0) return yield* Effect.die(new Error(`${Brand.command} review exited with code ${code}`))
  }),
})
