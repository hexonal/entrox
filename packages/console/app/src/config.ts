import { publicBrand } from "~/lib/brand"

/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: publicBrand.websiteURL,

  // GitHub
  github: {
    repoUrl: publicBrand.repositoryURL,
    starsFormatted: {
      compact: "160K",
      full: "160,000",
    },
  },

  // Social links
  social: {
    twitter: publicBrand.xURL,
    discord: publicBrand.discordURL,
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "900",
    commits: "13,000",
    monthlyUsers: "7.5M",
  },
} as const
