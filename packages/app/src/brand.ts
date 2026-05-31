export const Brand = {
  product: "Entrox",
  command: "entrox",
  docsURL: "https://entrox.996icu.wiki/docs",
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
  [/\bOpenCode\b/g, Brand.product],
  [/\bopencode\.jsonc\b/g, `${Brand.command}.jsonc`],
  [/\bopencode\.json\b/g, `${Brand.command}.json`],
  [/\bopencode\b/g, Brand.command],
]

export function brandText(value: string) {
  return replacements.reduce((result, [pattern, next]) => result.replace(pattern, next), value)
}

export function brandDictionary<T extends Record<string, string>>(dict: T): T {
  return Object.fromEntries(Object.entries(dict).map(([key, value]) => [key, brandText(value)])) as T
}
