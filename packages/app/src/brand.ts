export const Brand = {
  product: "Entrox",
  command: "entrox",
  domain: "entrox.996icu.wiki",
  docsURL: "https://entrox.996icu.wiki/docs",
  authURL: "https://entrox.996icu.wiki/auth",
  websiteURL: "https://entrox.996icu.wiki",
  feedbackURL: "https://entrox.996icu.wiki/support",
  faviconURL: "https://entrox.996icu.wiki/favicon-96x96-v3.png",
  faviconSVGURL: "https://entrox.996icu.wiki/favicon.svg",
  changelogURL: "https://entrox.996icu.wiki/changelog.json",
  themeDocsURL: "https://entrox.996icu.wiki/docs/themes/",
  providerDocsURL: "https://entrox.996icu.wiki/docs/providers/#custom-provider",
  githubRepositoryURL: "https://entrox.996icu.wiki",
  githubIssuesURL: "https://entrox.996icu.wiki/support",
} as const

const replacements: Array<[RegExp, string]> = [
  [/\bOpenCode Zen\b/g, Brand.product],
  [/https?:\/\/opencode\.ai\/zen\b/g, Brand.authURL],
  [/https?:\/\/opencode\.ai\/auth\b/g, Brand.authURL],
  [/https?:\/\/opencode\.ai\/docs\b/g, Brand.docsURL],
  [/https?:\/\/opencode\.ai\b/g, Brand.websiteURL],
  [/\bopencode\.ai\/zen\b/g, `${Brand.domain}/auth`],
  [/\bopencode\.ai\/auth\b/g, `${Brand.domain}/auth`],
  [/\bopencode\.ai\/docs\b/g, `${Brand.domain}/docs`],
  [/\bopencode\.ai\b/g, Brand.domain],
  [/\bOpenCode\b/g, Brand.product],
  [/\bopencode\.jsonc\b/g, `${Brand.command}.jsonc`],
  [/\bopencode\.json\b/g, `${Brand.command}.json`],
  [/(?<![@A-Za-z0-9_-])opencode(?![A-Za-z0-9_-])/g, Brand.command],
]

export function brandText(value: string) {
  return replacements.reduce((result, [pattern, next]) => result.replace(pattern, next), value)
}

export function brandDictionary<T extends Record<string, string>>(dict: T): T {
  return Object.fromEntries(Object.entries(dict).map(([key, value]) => [key, brandText(value)])) as T
}
