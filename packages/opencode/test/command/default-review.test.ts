import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Command } from "../../src/command"
import { Config } from "../../src/config/config"
import { MCP } from "../../src/mcp"
import { Skill } from "../../src/skill"
import { TestConfig } from "../fixture/config"
import { testEffect } from "../lib/effect"

const emptyMcp = Layer.succeed(
  MCP.Service,
  MCP.Service.of({
    status: () => Effect.succeed({}),
    clients: () => Effect.succeed({}),
    tools: () => Effect.succeed({}),
    prompts: () => Effect.succeed({}),
    resources: () => Effect.succeed({}),
    resourceTemplates: () => Effect.succeed({}),
    add: () => Effect.succeed({ status: {} }),
    connect: () => Effect.void,
    disconnect: () => Effect.void,
    getPrompt: () => Effect.succeed(undefined),
    readResource: () => Effect.succeed(undefined),
    startAuth: () => Effect.die("unexpected MCP auth"),
    authenticate: () => Effect.die("unexpected MCP auth"),
    finishAuth: () => Effect.die("unexpected MCP auth"),
    removeAuth: () => Effect.void,
    supportsOAuth: () => Effect.succeed(false),
    hasStoredTokens: () => Effect.succeed(false),
    getAuthStatus: () => Effect.succeed("not_authenticated" as const),
  }),
)

const emptySkill = Layer.succeed(
  Skill.Service,
  Skill.Service.of({
    get: () => Effect.succeed(undefined),
    require: () => Effect.die("unexpected skill lookup"),
    all: () => Effect.succeed([]),
    dirs: () => Effect.succeed([]),
    available: () => Effect.succeed([]),
  }),
)

const layer = (config: Config.Info = {}) =>
  Command.layer.pipe(
    Layer.provide(TestConfig.layer({ get: () => Effect.succeed(config), getGlobal: () => Effect.succeed(config) })),
    Layer.provide(emptyMcp),
    Layer.provide(emptySkill),
  )

describe("default review command", () => {
  testEffect(layer({ review_model: "openai/gpt-5.4" })).instance("uses configured review_model", () =>
    Effect.gen(function* () {
      const review = yield* Command.Service.use((svc) => svc.get(Command.Default.REVIEW))

      expect(review?.model).toBe("openai/gpt-5.4")
    }),
  )

  testEffect(layer()).instance("leaves model unset without review_model", () =>
    Effect.gen(function* () {
      const review = yield* Command.Service.use((svc) => svc.get(Command.Default.REVIEW))

      expect(review?.model).toBeUndefined()
    }),
  )

  testEffect(layer()).instance("uses Codex-style structured review output instructions", () =>
    Effect.gen(function* () {
      const review = yield* Command.Service.use((svc) => svc.get(Command.Default.REVIEW))
      const template = yield* Effect.promise(async () => review?.template)

      expect(template).toContain("OUTPUT FORMAT")
      expect(template).toContain('"findings"')
      expect(template).toContain('"overall_correctness"')
      expect(template).toContain('"absolute_file_path"')
      expect(template).toContain('"line_range"')
      expect(template).toContain("code_location should overlap with the diff")
      expect(template).toContain("Do not generate a PR fix")
    }),
  )

  testEffect(layer()).instance("keeps branch review scoped to HEAD", () =>
    Effect.gen(function* () {
      const review = yield* Command.Service.use((svc) => svc.get(Command.Default.REVIEW))
      const template = yield* Effect.promise(async () => review?.template)

      expect(template).toContain("git merge-base HEAD $ARGUMENTS")
      expect(template).toContain("git diff <merge-base-sha> HEAD")
      expect(template).toContain("git diff $ARGUMENTS...HEAD")
    }),
  )

  testEffect(layer()).instance("preserves supported review target instructions", () =>
    Effect.gen(function* () {
      const review = yield* Command.Service.use((svc) => svc.get(Command.Default.REVIEW))
      const template = yield* Effect.promise(async () => review?.template)

      expect(template).toContain("git diff` for unstaged changes")
      expect(template).toContain("git diff --cached")
      expect(template).toContain("git status --short")
      expect(template).toContain("git show $ARGUMENTS")
      expect(template).toContain("gh pr view $ARGUMENTS")
      expect(template).toContain("gh pr diff $ARGUMENTS")
    }),
  )
})
