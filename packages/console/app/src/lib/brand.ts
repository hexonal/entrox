export const publicBrand = {
  product: "Entrox",
  command: "entrox",
  domain: "entrox.996icu.wiki",
  websiteURL: "https://entrox.996icu.wiki",
  installURL: "https://entrox.996icu.wiki/install",
  docsHost: "entrox.996icu.wiki",
  statsHost: "stats.entrox.996icu.wiki",
  statsDevHost: "stats.dev.entrox.996icu.wiki",
  repository: "hexonal/entrox",
  repositoryURL: "https://github.com/hexonal/entrox",
  releaseRepository: "hexonal/entrox",
  packageName: "entrox",
  desktopPackageName: "entrox-desktop",
  contactEmail: "w741069229@gmail.com",
  discordURL: "https://entrox.996icu.wiki/discord",
  xURL: "https://x.com/entrox_cli",
} as const

const replacements: Array<[RegExp, string]> = [
  [/\bOpenCode Zen\b/g, publicBrand.product],
  [/\bOpenCode Go\b/g, publicBrand.product],
  [/\bOpenCode\b/g, publicBrand.product],
  [/\bOPENCODE\b/g, publicBrand.product.toUpperCase()],
  [/https?:\/\/opencode\.ai\/install\b/g, publicBrand.installURL],
  [/https?:\/\/opencode\.ai\b/g, publicBrand.websiteURL],
  [/\bopencode\.ai\b/g, publicBrand.domain],
  [/\banomalyco\/tap\/opencode\b/g, "hexonal/tap/entrox"],
  [/\banomalyco\/tap\/entrox\b/g, "hexonal/tap/entrox"],
  [/\banomalyco\/opencode-beta\b/g, publicBrand.repository],
  [/\banomalyco\/opencode\b/g, publicBrand.repository],
  [/\bsst\/opencode\b/g, publicBrand.repository],
  [/https?:\/\/anoma\.ly\b/g, publicBrand.websiteURL],
  [/\bAnomaly Innovations Inc\.?\b/g, "Hexonal"],
  [/\bAnomaly Innovations\b/g, "Hexonal"],
  [/\bAnomaly\b/g, "Hexonal"],
  [/\bopencode-ai\b/g, publicBrand.packageName],
  [/\bopencode-cli\b/g, `${publicBrand.command}-cli`],
  [/\bopencode-desktop\b/g, publicBrand.desktopPackageName],
  [/\bopencode-bin\b/g, `${publicBrand.command}-bin`],
  [/\bopencode\b/g, publicBrand.command],
]

export function brandPublicText(value: string) {
  return replacements.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value)
}
