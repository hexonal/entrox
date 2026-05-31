import { Effect } from "effect"
import { ProviderBrand } from "../../brand"
import { PluginV2 } from "../../plugin"

export const VercelPlugin = PluginV2.define({
  id: PluginV2.ID.make("vercel"),
  effect: Effect.gen(function* () {
    return {
      "catalog.transform": Effect.fn(function* (evt) {
        for (const item of evt.provider.list()) {
          if (item.provider.endpoint.type !== "aisdk") continue
          if (item.provider.endpoint.package !== "@ai-sdk/vercel") continue
          evt.provider.update(item.provider.id, (provider) => {
            provider.options.headers["http-referer"] = ProviderBrand.websiteURL
            provider.options.headers["x-title"] = ProviderBrand.title
          })
        }
      }),
      "aisdk.sdk": Effect.fn(function* (evt) {
        if (evt.package !== "@ai-sdk/vercel") return
        const mod = yield* Effect.promise(() => import("@ai-sdk/vercel"))
        evt.sdk = mod.createVercel(evt.options)
      }),
    }
  }),
})
