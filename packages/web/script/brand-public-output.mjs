#!/usr/bin/env bun

import { readdir, readFile, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { gunzipSync, gzipSync } from "node:zlib"
import { brandPublicArtifactText, brandPublicText } from "../src/brand.mjs"

const defaultRoot = fileURLToPath(new URL("../dist/", import.meta.url))
const textExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".svg", ".txt", ".webmanifest", ".xml"])
const compressedExtensions = new Set([".pf_fragment", ".pf_meta"])

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await rewritePublicBrandOutput(defaultRoot)
}

export async function rewritePublicBrandOutput(
  root = defaultRoot,
  options = {
    compressed: true,
    log: true,
  },
) {
  let changed = 0
  for (const file of await collectFiles(root, options)) {
    if (compressedExtensions.has(extname(file))) {
      changed += await rewriteCompressedFile(file)
      continue
    }
    changed += await rewriteTextFile(file)
  }

  if (options.log !== false && changed > 0) console.log(`applied Entrox public branding to ${changed} build files`)
  return changed
}

async function rewriteTextFile(file) {
  const current = await readFile(file, "utf8")
  if (isBrandRuntimeChunk(current)) return 0
  const next = isEscapedContentChunk(file) ? brandPublicArtifactText(current) : brandPublicText(current)
  if (next === current) return 0
  await writeFile(file, next)
  return 1
}

async function rewriteCompressedFile(file) {
  const current = gunzipSync(await readFile(file)).toString("utf8")
  const next = brandPublicText(current)
  if (next === current) return 0
  await writeFile(file, gzipSync(next))
  return 1
}

function isEscapedContentChunk(file) {
  return file.includes("_astro_data-layer-content_")
}

function isBrandRuntimeChunk(text) {
  return text.includes("const replacements = [") && text.includes("function brandPublicText")
}

async function collectFiles(dir, options) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...(await collectFiles(file, options)))
      continue
    }
    if (!entry.isFile()) continue
    const extension = extname(entry.name)
    if (!textExtensions.has(extension) && !(options.compressed !== false && compressedExtensions.has(extension))) continue
    result.push(file)
  }
  return result
}
