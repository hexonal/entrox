import { expect, test } from "bun:test"
import { Brand } from "../../../src/brand"
import { parsePrSessionUrl } from "../../../src/cli/cmd/pr"

test("parses branded PR session links", () => {
  expect(parsePrSessionUrl(`[${Brand.name} session](${Brand.shareBaseURL}/s/ses_123)`)).toBe(
    `${Brand.shareBaseURL}/share/ses_123`,
  )
  expect(parsePrSessionUrl(`${Brand.shareBaseURL}/share/ses_456`)).toBe(`${Brand.shareBaseURL}/share/ses_456`)
})

test("ignores unrelated PR links", () => {
  expect(parsePrSessionUrl("https://example.com/s/nope")).toBeUndefined()
})
