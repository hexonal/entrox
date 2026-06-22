import { Effect } from "effect"
import { ProviderBrand } from "../../brand"
import { define } from "@opencode-ai/plugin/v2/effect"

export const NvidiaPlugin = define({
  id: "nvidia",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.catalog.transform(
      Effect.fn(function* (evt) {
        for (const item of evt.provider.list()) {
          if (item.provider.api.type !== "aisdk") continue
          if (item.provider.api.package !== "@ai-sdk/openai-compatible") continue
          if (item.provider.api.url !== "https://integrate.api.nvidia.com/v1") continue
          evt.provider.update(item.provider.id, (provider) => {
            provider.request.headers["HTTP-Referer"] = ProviderBrand.websiteURL
            provider.request.headers["X-Title"] = ProviderBrand.title
            provider.request.headers["X-BILLING-INVOKE-ORIGIN"] ??= ProviderBrand.product
          })
        }
      }),
    )
  }),
})
