import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const modelsUrl = process.env.OPENCODE_MODELS_URL || "https://models.dev"

function sanitizeModelsData(text: string) {
  const data = JSON.parse(text) as Record<string, unknown>
  delete data.opencode
  delete data["opencode-go"]
  return JSON.stringify(data)
}

export const modelsData = process.env.MODELS_DEV_API_JSON
  ? sanitizeModelsData(await Bun.file(process.env.MODELS_DEV_API_JSON).text())
  : await fetch(`${modelsUrl}/api.json`).then((x) => x.text().then(sanitizeModelsData))
console.log("Loaded models.dev snapshot")
