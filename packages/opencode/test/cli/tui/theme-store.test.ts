import { expect, test } from "bun:test"

const { Brand } = await import("../../../src/brand")
const { DEFAULT_THEMES, allThemes, addTheme, hasTheme, resolveTheme } = await import(
  "../../../src/cli/cmd/tui/context/theme"
)
const defaultTheme = DEFAULT_THEMES[Brand.name]

test("addTheme writes into module theme store", () => {
  const name = `plugin-theme-${Date.now()}`
  expect(addTheme(name, defaultTheme)).toBe(true)

  expect(allThemes()[name]).toBeDefined()
})

test("addTheme keeps first theme for duplicate names", () => {
  const name = `plugin-theme-keep-${Date.now()}`
  const one = structuredClone(defaultTheme)
  const two = structuredClone(defaultTheme)
  one.theme.primary = "#101010"
  two.theme.primary = "#fefefe"

  expect(addTheme(name, one)).toBe(true)
  expect(addTheme(name, two)).toBe(false)

  expect(allThemes()[name]).toBeDefined()
  expect(allThemes()[name]!.theme.primary).toBe("#101010")
})

test("addTheme ignores entries without a theme object", () => {
  const name = `plugin-theme-invalid-${Date.now()}`
  expect(addTheme(name, { defs: { a: "#ffffff" } })).toBe(false)
  expect(allThemes()[name]).toBeUndefined()
})

test("hasTheme checks theme presence", () => {
  const name = `plugin-theme-has-${Date.now()}`
  expect(hasTheme(name)).toBe(false)
  expect(addTheme(name, defaultTheme)).toBe(true)
  expect(hasTheme(name)).toBe(true)
})

test("default themes expose Entrox while keeping legacy theme lookup compatible", () => {
  expect(DEFAULT_THEMES[Brand.name]).toBeDefined()
  expect(Object.keys(allThemes())).toContain(Brand.name)
  expect(Object.keys(allThemes())).not.toContain(Brand.legacyCommand)
  expect(hasTheme(Brand.legacyCommand)).toBe(true)
})

test("resolveTheme rejects circular color refs", () => {
  const item = structuredClone(defaultTheme)
  item.defs = {
    ...item.defs,
    one: "two",
    two: "one",
  }
  item.theme.primary = "one"

  expect(() => resolveTheme(item, "dark")).toThrow("Circular color reference")
})
