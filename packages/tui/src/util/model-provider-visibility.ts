import { Brand } from "../brand"

type ModelProvider = {
  id: string
}

type ModelSelection = {
  providerID: string
}

export function isVisibleModelProviderID(providerID: string) {
  const ids: readonly string[] = Brand.visibleModelProviderIDs
  if (ids.includes(providerID)) return true

  const prefixes: readonly string[] = Brand.visibleModelProviderIDPrefixes
  return prefixes.some((prefix) => providerID.startsWith(prefix))
}

function matchesModelProviderScope(providerID: string, scopedProviderID?: string) {
  if (scopedProviderID) return providerID === scopedProviderID
  return isVisibleModelProviderID(providerID)
}

export function visibleModelProviders<T extends ModelProvider>(providers: readonly T[], scopedProviderID?: string) {
  return providers.filter((provider) => matchesModelProviderScope(provider.id, scopedProviderID))
}

export function visibleModelSelections<T extends ModelSelection>(items: readonly T[], scopedProviderID?: string) {
  return items.filter((item) => matchesModelProviderScope(item.providerID, scopedProviderID))
}
