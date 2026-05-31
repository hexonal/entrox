#!/usr/bin/env bun

import path from "node:path"

type Finding = {
  file: string
  line: number
  label: string
  text: string
}

type Rule = {
  label: string
  pattern: RegExp
}

const root = path.resolve(import.meta.dir, "..")
const scanGlobs = [
  ".github/**/*.{yml,yaml}",
  "script/**/*.{ts,js,mjs}",
  "packages/opencode/script/**/*.{ts,js,mjs}",
  "packages/desktop/**/*.{ts,tsx,html,json,md,yml,yaml}",
  "packages/app/src/**/*.{ts,tsx,html,json}",
  "packages/console/app/src/**/*.{ts,tsx,json}",
  "packages/console/function/src/**/*.{ts,tsx,json}",
  "packages/ui/src/**/*.{ts,tsx,json}",
  "packages/stats/app/src/**/*.{ts,tsx,json}",
  "packages/web/src/**/*.{astro,ts,tsx,mjs,json}",
  "packages/web/script/**/*.{js,mjs,ts}",
  "packages/web/dist/**/*.{css,html,js,json,mjs,svg,txt,webmanifest,xml}",
  "package.json",
  "README.md",
  "SECURITY.md",
  "install",
  "specs/entrox-login-todo.md",
] as const

const ignoredPathParts = [
  "/.git/",
  "/.turbo/",
  "/out/",
  "/node_modules/",
  "/packages/app/src/i18n/",
  "/packages/console/app/src/i18n/",
  "/packages/desktop/src/renderer/i18n/",
] as const

const rules: Rule[] = [
  { label: "upstream repository", pattern: /\b(?:anomalyco|sst)\/opencode\b/ },
  { label: "upstream tap repository", pattern: /\banomalyco\/tap\/(?:opencode|entrox)\b/ },
  { label: "upstream container repository", pattern: /\bghcr\.io\/anomalyco\/opencode\b/ },
  { label: "legacy fork repository", pattern: /\bhexonal\/opencode\b/ },
  { label: "upstream company domain", pattern: /\banoma\.ly\b/ },
  { label: "upstream company name", pattern: /\bAnomaly(?: Innovations(?: Inc\.?)?)?\b/ },
  { label: "upstream website", pattern: /\b(?:https?:\/\/)?opencode\.ai\b/ },
  { label: "legacy npm package", pattern: /(?<!@)\bopencode-ai\b/ },
  { label: "legacy product name", pattern: /\bOpenCode\b/ },
  { label: "legacy release artifact", pattern: /\bopencode-(?:cli|desktop|darwin|linux|windows|bin)\b/ },
]

const allowedFragments = [
  "@opencode-ai/",
  "OPENCODE_",
  "opencode-app-",
  "packages/opencode",
  "ProviderV2.ID.opencode",
  "/.well-known/opencode",
  "x-opencode-",
  ".opencode",
  "opencode.json",
  "opencode/",
  "opencode-agent[bot]",
] as const

/**
 * Returns true when a legacy brand hit is an intentional compatibility surface.
 */
function isAllowed(file: string, text: string): boolean {
  if (file === "packages/app/src/brand.ts" || file === "packages/app/src/brand.test.ts") return true
  if (file === "packages/console/app/src/lib/brand.ts") return true
  if (file === "packages/web/src/brand.mjs") return true
  if (file === "packages/opencode/src/brand.ts") return true
  if (file === "script/entrox-whitelabel-check.ts") return true
  if (
    file.startsWith("packages/web/dist/_worker.js/chunks/middleware_") &&
    text.trim().startsWith("[/") &&
    (text.includes("OpenCode") || text.includes("opencode"))
  ) {
    return true
  }
  return allowedFragments.some((fragment) => text.includes(fragment))
}

/**
 * Expands configured glob roots into unique repo-relative file paths.
 */
async function collectFiles(): Promise<string[]> {
  const files = new Set<string>()
  for (const pattern of scanGlobs) {
    for await (const file of new Bun.Glob(pattern).scan({ cwd: root, onlyFiles: true })) {
      const normalized = file.replaceAll("\\", "/")
      const absolute = `/${normalized}`
      if (ignoredPathParts.some((part) => absolute.includes(part))) continue
      files.add(normalized)
    }
  }
  return [...files].sort()
}

/**
 * Finds disallowed legacy brand text in a single file.
 */
async function scanFile(file: string): Promise<Finding[]> {
  const text = await Bun.file(path.join(root, file)).text()
  const findings: Finding[] = []
  text.split(/\r?\n/).forEach((lineText, index) => {
    if (isAllowed(file, lineText)) return
    for (const rule of rules) {
      if (!rule.pattern.test(lineText)) continue
      findings.push({
        file,
        line: index + 1,
        label: rule.label,
        text: lineText.trim(),
      })
    }
  })
  return findings
}

const findings = (await Promise.all((await collectFiles()).map(scanFile))).flat()

if (findings.length > 0) {
  console.error("Entrox white-label check failed:")
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.label}: ${finding.text}`)
  }
  process.exit(1)
}

console.log("Entrox white-label check passed")
