import { makeDefaultApi } from "@opencode-ai/protocol/api"
import { OpenApi } from "effect/unstable/httpapi"
import { LocationMiddleware } from "./location"
import { SessionLocationMiddleware } from "./middleware/session-location"

export const Api = makeDefaultApi({
  locationMiddleware: LocationMiddleware,
  sessionLocationMiddleware: SessionLocationMiddleware,
}).annotateMerge(
  OpenApi.annotations({
    title: "entrox HttpApi",
    version: "0.0.1",
    description: "Experimental HttpApi surface for selected instance routes.",
  }),
)
