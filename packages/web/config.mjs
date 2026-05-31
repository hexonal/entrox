const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://entrox.996icu.wiki" : `https://${stage}.entrox.996icu.wiki`,
  console: stage === "production" ? "https://entrox.996icu.wiki/auth" : `https://${stage}.entrox.996icu.wiki/auth`,
  email: "w741069229@gmail.com",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/hexonal/entrox",
  discord: "https://entrox.996icu.wiki/support",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
