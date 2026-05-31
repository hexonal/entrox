export const publicBrand = {
  product: "Entrox",
  command: "entrox",
  websiteURL: "https://entrox.996icu.wiki",
  docsURL: "https://entrox.996icu.wiki/docs",
  authURL: "https://entrox.996icu.wiki/auth",
  installURL: "https://entrox.996icu.wiki/install",
  configSchemaURL: "https://entrox.996icu.wiki/config.json",
  tuiSchemaURL: "https://entrox.996icu.wiki/tui.json",
  githubAction: "hexonal/entrox/github@latest",
}

const replacements = [
  [/\bOpenCode Zen\b/g, publicBrand.product],
  [/\bOpenCode Go\b/g, publicBrand.product],
  [/\bOpenCode[A-Za-z]*\b/g, publicBrand.product],
  [/\bOpenCode\b/g, publicBrand.product],
  [/https?:\/\/opencode\.ai\/install\b/g, publicBrand.installURL],
  [/https?:\/\/opencode\.ai\/docs\b/g, publicBrand.docsURL],
  [/https?:\/\/opencode\.ai\/auth\b/g, publicBrand.authURL],
  [/https?:\/\/opencode\.ai\/zen\b/g, publicBrand.authURL],
  [/https?:\/\/opencode\.ai\/config\.json\b/g, publicBrand.configSchemaURL],
  [/https?:\/\/opencode\.ai\/tui\.json\b/g, publicBrand.tuiSchemaURL],
  [/https?:\/\/opencode\.ai\b/g, publicBrand.websiteURL],
  [/\bopencode\.ai\b/g, "entrox.996icu.wiki"],
  [/\banomalyco\/opencode\/github@latest\b/g, publicBrand.githubAction],
  [/\banomalyco\/tap\/opencode\b/g, "hexonal/tap/entrox"],
  [/\banomalyco\/tap\/entrox\b/g, "hexonal/tap/entrox"],
  [/\bgithub:anomalyco\/opencode\b/g, "github:hexonal/entrox"],
  [/\bghcr\.io\/anomalyco\/opencode\b/g, "ghcr.io/hexonal/entrox"],
  [/\banomalyco\/opencode\b/g, "hexonal/entrox"],
  [/\bsst\/opencode\b/g, "hexonal/entrox"],
  [/https?:\/\/anoma\.ly\b/g, publicBrand.websiteURL],
  [/\bAnomaly Innovations Inc\.?\b/g, "Hexonal"],
  [/\bAnomaly Innovations\b/g, "Hexonal"],
  [/\bAnomaly\b/g, "Hexonal"],
  [/\bopencode-ai\b/g, publicBrand.command],
  [/\bopencode-cli\b/g, `${publicBrand.command}-cli`],
  [/\bopencode-desktop\b/g, `${publicBrand.command}-desktop`],
  [/\bopencode-darwin\b/g, `${publicBrand.command}-darwin`],
  [/\bopencode-linux\b/g, `${publicBrand.command}-linux`],
  [/\bopencode-windows\b/g, `${publicBrand.command}-windows`],
  [/\bopencode-bin\b/g, `${publicBrand.command}-bin`],
  [/\bopencode\.jsonc\b/g, `${publicBrand.command}.jsonc`],
  [/\bopencode\.json\b/g, `${publicBrand.command}.json`],
  [/\bopencode:\/\//g, `${publicBrand.command}://`],
  [/\bopencode\//g, `${publicBrand.command}/`],
  [/\bopencode\b/g, publicBrand.command],
]

const artifactReplacements = [
  [/OpenCode Zen/g, publicBrand.product],
  [/OpenCode Go/g, publicBrand.product],
  [/OpenCode[A-Za-z]*/g, publicBrand.product],
  [/https?:\/\/opencode\.ai\/install/g, publicBrand.installURL],
  [/https?:\/\/opencode\.ai\/docs/g, publicBrand.docsURL],
  [/https?:\/\/opencode\.ai\/auth/g, publicBrand.authURL],
  [/https?:\/\/opencode\.ai\/zen/g, publicBrand.authURL],
  [/https?:\/\/opencode\.ai\/config\.json/g, publicBrand.configSchemaURL],
  [/https?:\/\/opencode\.ai\/tui\.json/g, publicBrand.tuiSchemaURL],
  [/https?:\/\/opencode\.ai/g, publicBrand.websiteURL],
  [/opencode\.ai/g, "entrox.996icu.wiki"],
  [/anomalyco\/opencode\/github@latest/g, publicBrand.githubAction],
  [/anomalyco\/tap\/opencode/g, "hexonal/tap/entrox"],
  [/anomalyco\/tap\/entrox/g, "hexonal/tap/entrox"],
  [/github:anomalyco\/opencode/g, "github:hexonal/entrox"],
  [/ghcr\.io\/anomalyco\/opencode/g, "ghcr.io/hexonal/entrox"],
  [/anomalyco\/opencode/g, "hexonal/entrox"],
  [/sst\/opencode/g, "hexonal/entrox"],
  [/https?:\/\/anoma\.ly/g, publicBrand.websiteURL],
  [/Anomaly Innovations Inc\.?/g, "Hexonal"],
  [/Anomaly Innovations/g, "Hexonal"],
  [/Anomaly/g, "Hexonal"],
  [/opencode-ai/g, publicBrand.command],
  [/opencode-cli/g, `${publicBrand.command}-cli`],
  [/opencode-desktop/g, `${publicBrand.command}-desktop`],
  [/opencode-darwin/g, `${publicBrand.command}-darwin`],
  [/opencode-linux/g, `${publicBrand.command}-linux`],
  [/opencode-windows/g, `${publicBrand.command}-windows`],
  [/opencode-bin/g, `${publicBrand.command}-bin`],
  [/opencode\.jsonc/g, `${publicBrand.command}.jsonc`],
  [/opencode\.json/g, `${publicBrand.command}.json`],
  [/opencode:\/\//g, `${publicBrand.command}://`],
  [/opencode\//g, `${publicBrand.command}/`],
  [
    /(^|\\[nrt]|[^A-Za-z0-9_])opencode(?![A-Za-z0-9_])/g,
    (_match, prefix) => `${prefix}${publicBrand.command}`,
  ],
]

export function brandPublicText(value) {
  if (typeof value !== "string") return value
  return replacements.reduce((result, [pattern, next]) => result.replace(pattern, next), value)
}

export function brandPublicArtifactText(value) {
  if (typeof value !== "string") return value
  const branded = brandPublicText(value)
  return artifactReplacements.reduce((result, [pattern, next]) => result.replace(pattern, next), branded)
}
