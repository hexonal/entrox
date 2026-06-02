import { describe, expect } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Installation } from "../../src/installation"
import { InstallationChannel } from "@opencode-ai/core/installation/version"
import { AppProcess } from "@opencode-ai/core/process"
import { testEffect } from "../lib/effect"
import { Brand } from "@/brand"

const encoder = new TextEncoder()

function mockHttpClient(handler: (request: HttpClientRequest.HttpClientRequest) => Response) {
  const client = HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, handler(request))))
  return Layer.succeed(HttpClient.HttpClient, client)
}

function mockSpawner(
  handler: (cmd: string, args: readonly string[]) => string | { code: number; stdout?: string; stderr?: string } = () =>
    "",
) {
  const spawner = ChildProcessSpawner.make((command) => {
    const std = ChildProcess.isStandardCommand(command) ? command : undefined
    const result = handler(std?.command ?? "", std?.args ?? [])
    const output = typeof result === "string" ? { code: 0, stdout: result, stderr: "" } : result
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(0),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(output.code)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        stdin: { [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") } as any,
        stdout: output.stdout ? Stream.make(encoder.encode(output.stdout)) : Stream.empty,
        stderr: output.stderr ? Stream.make(encoder.encode(output.stderr)) : Stream.empty,
        all: Stream.empty,
        getInputFd: () => ({ [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") }) as any,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void),
      }),
    )
  })
  return Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner)
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function testLayer(
  httpHandler: (request: HttpClientRequest.HttpClientRequest) => Response,
  spawnHandler?: (cmd: string, args: readonly string[]) => string | { code: number; stdout?: string; stderr?: string },
) {
  const appProcess = AppProcess.layer.pipe(Layer.provide(mockSpawner(spawnHandler)))
  return Installation.layer.pipe(Layer.provide(mockHttpClient(httpHandler)), Layer.provide(appProcess))
}

describe("installation", () => {
  describe("latest", () => {
    const unknownCalls: string[] = []
    testEffect(
      testLayer((request) => {
        unknownCalls.push(request.url)
        return jsonResponse({ version: "0.0.0-ci.23.1" })
      }),
    ).effect(
      "reads unknown installer versions from the Entrox dev manifest",
      () =>
        Effect.gen(function* () {
          const result = yield* Installation.use.latest("unknown")
          expect(result).toBe("0.0.0-ci.23.1")
          expect(unknownCalls).toContain(`${Brand.websiteURL}/downloads/entrox-dev/latest.json`)
        }),
    )

    const curlCalls: string[] = []
    testEffect(
      testLayer((request) => {
        curlCalls.push(request.url)
        return jsonResponse({ version: "0.0.0-ci.22.1" })
      }),
    ).effect(
      "reads curl installer versions from the Entrox dev manifest",
      () =>
        Effect.gen(function* () {
          const result = yield* Installation.use.latest("curl")
          expect(result).toBe("0.0.0-ci.22.1")
          expect(curlCalls).toContain(`${Brand.websiteURL}/downloads/entrox-dev/latest.json`)
        }),
    )

    const npmCalls: string[] = []
    testEffect(
      testLayer((request) => {
        npmCalls.push(request.url)
        return jsonResponse({ version: "1.5.0" })
      }),
    ).effect("reads npm versions via registry", () =>
      Effect.gen(function* () {
        const result = yield* Installation.use.latest("npm")
        expect(result).toBe("1.5.0")
        expect(npmCalls).toContain(`https://registry.npmjs.org/${Brand.npmPackageName}/${InstallationChannel}`)
      }),
    )

    const bunCalls: string[] = []
    testEffect(
      testLayer((request) => {
        bunCalls.push(request.url)
        return jsonResponse({ version: "1.6.0" })
      }),
    ).effect("reads bun versions via registry", () =>
      Effect.gen(function* () {
        const result = yield* Installation.use.latest("bun")
        expect(result).toBe("1.6.0")
        expect(bunCalls).toContain(`https://registry.npmjs.org/${Brand.npmPackageName}/${InstallationChannel}`)
      }),
    )

    const pnpmCalls: string[] = []
    testEffect(
      testLayer((request) => {
        pnpmCalls.push(request.url)
        return jsonResponse({ version: "1.7.0" })
      }),
    ).effect("reads pnpm versions via registry", () =>
      Effect.gen(function* () {
        const result = yield* Installation.use.latest("pnpm")
        expect(result).toBe("1.7.0")
        expect(pnpmCalls).toContain(`https://registry.npmjs.org/${Brand.npmPackageName}/${InstallationChannel}`)
      }),
    )

    const scoopCalls: string[] = []
    testEffect(
      testLayer((request) => {
        scoopCalls.push(request.url)
        return jsonResponse({ version: "0.0.0-ci.23.1" })
      }),
    ).effect("reads scoop installer versions from the Entrox dev manifest", () =>
      Effect.gen(function* () {
        const result = yield* Installation.use.latest("scoop")
        expect(result).toBe("0.0.0-ci.23.1")
        expect(scoopCalls).toContain(`${Brand.websiteURL}/downloads/entrox-dev/latest.json`)
      }),
    )

    testEffect(testLayer(() => jsonResponse({ d: { results: [{ Version: "3.4.5" }] } }))).effect(
      "reads chocolatey feed versions",
      () =>
        Effect.gen(function* () {
          const result = yield* Installation.use.latest("choco")
          expect(result).toBe("3.4.5")
        }),
    )

    const brewCalls: string[] = []
    const brewHttpCalls: string[] = []
    testEffect(
      testLayer(
        (request) => {
          brewHttpCalls.push(request.url)
          return jsonResponse({ version: "0.0.0-ci.23.1" })
        },
        (cmd, args) => {
          if (cmd === "brew") brewCalls.push(args.join(" "))
          return ""
        },
      ),
    ).effect("reads brew installer versions from the Entrox dev manifest", () =>
      Effect.gen(function* () {
        const result = yield* Installation.use.latest("brew")
        expect(result).toBe("0.0.0-ci.23.1")
        expect(brewHttpCalls).toContain(`${Brand.websiteURL}/downloads/entrox-dev/latest.json`)
        expect(brewCalls).toEqual([])
      }),
    )
  })

  describe("upgrade", () => {
    testEffect(
      testLayer(
        () => jsonResponse({}),
        (cmd) => {
          if (cmd === "npm") return { code: 1, stderr: "token=secret command output" }
          return ""
        },
      ),
    ).effect("returns sanitized typed errors for failed package upgrades", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Installation.use.upgrade("npm", "9.9.9"))
        expect(error).toBeInstanceOf(Installation.UpgradeFailedError)
        expect(error.stderr).toBe("Upgrade failed for npm (exit code 1).")
        expect(error.message).toBe(error.stderr)
        expect(error.stderr).not.toContain("secret")
        expect(error.stderr).not.toContain("command output")
      }),
    )

    testEffect(
      testLayer(
        () => new Response("install script with token=secret", { status: 200 }),
        (cmd) => {
          if (cmd === "bash") return { code: 1, stderr: "script output with token=secret" }
          return ""
        },
      ),
    ).effect("returns sanitized typed errors when the curl install script fails", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Installation.use.upgrade("curl", "9.9.9"))
        expect(error).toBeInstanceOf(Installation.UpgradeFailedError)
        expect(error.stderr).toBe("Upgrade failed for curl (exit code 1).")
        expect(error.message).toBe(error.stderr)
        expect(error.stderr).not.toContain("secret")
        expect(error.stderr).not.toContain("script output")
      }),
    )

    const brewUpgradeCalls: string[] = []
    const brewGitCalls: string[] = []
    testEffect(
      testLayer(
        () => jsonResponse({}),
        (cmd, args) => {
          if (cmd === "brew") brewUpgradeCalls.push(args.join(" "))
          if (cmd === "brew" && args.join(" ") === "--repository") return "/opt/homebrew\n"
          if (cmd === "git") brewGitCalls.push(args.join(" "))
          if (args.join(" ") === "--version") return "9.9.9\n"
          return ""
        },
      ),
    ).effect("refreshes and trusts the Entrox tap before brew upgrades", () =>
      Effect.gen(function* () {
        yield* Installation.use.upgrade("brew", "9.9.9")

        expect(brewUpgradeCalls).toEqual([
          `tap ${Brand.homebrewTapName}`,
          "--repository",
          `trust ${Brand.homebrewTapName}`,
          `upgrade ${Brand.homebrewTapName}/${Brand.packageName}`,
        ])
        expect(brewGitCalls).toEqual([
          "-C /opt/homebrew/Library/Taps/hexonal/homebrew-entrox fetch origin",
          "-C /opt/homebrew/Library/Taps/hexonal/homebrew-entrox reset --hard origin/main",
          "-C /opt/homebrew/Library/Taps/hexonal/homebrew-entrox clean -fd",
        ])
      }),
    )

    testEffect(
      testLayer(
        () => jsonResponse({}),
        (cmd, args) => {
          if (cmd === "npm") return ""
          if (args.join(" ") === "--version") return "9.9.8\n"
          return ""
        },
      ),
    ).effect("fails when upgrade does not install the requested version", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Installation.use.upgrade("npm", "9.9.9"))
        expect(error).toBeInstanceOf(Installation.UpgradeFailedError)
        expect(error.stderr).toBe("Upgrade verification failed: expected 9.9.9, but entrox reports 9.9.8.")
      }),
    )
  })
})
