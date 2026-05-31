import { Effect } from "effect"
import { ProviderBrand } from "../../brand"
import { PluginV2 } from "../../plugin"

export const LLMGatewayPlugin = PluginV2.define({
  id: PluginV2.ID.make("llmgateway"),
  effect: Effect.gen(function* () {
    return {
      "catalog.transform": Effect.fn(function* (evt) {
        for (const item of evt.provider.list()) {
          if (item.provider.enabled === false) continue
          if (item.provider.endpoint.type !== "aisdk") continue
          if (item.provider.endpoint.package !== "@ai-sdk/openai-compatible") continue
          if (item.provider.endpoint.url !== "https://api.llmgateway.io/v1") continue
          evt.provider.update(item.provider.id, (provider) => {
            provider.options.headers["HTTP-Referer"] = ProviderBrand.websiteURL
            provider.options.headers["X-Title"] = ProviderBrand.title
            provider.options.headers["X-Source"] = ProviderBrand.title
          })
        }
      }),
    }
  }),
})
