#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"
import { Brand } from "../src/brand"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)
const binaryName = pkg.name
const releaseRepo = process.env.GH_REPO ?? Brand.releaseRepository
const homebrewTapRepo = process.env.HOMEBREW_TAP_REPO ?? Brand.homebrewTapRepository
const scoopBucketRepo = process.env.SCOOP_BUCKET_REPO ?? Brand.scoopBucketRepository

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  // GitHub artifact downloads can drop the executable bit, and Docker uses the
  // unpacked dist binaries directly rather than the published tarball.
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  await $`bun pm pack`.cwd(dir)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(dir)
}

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const pkg = await Bun.file(`./dist/${filepath}`).json()
  binaries[pkg.name] = pkg.version
}
console.log("binaries", binaries)
const version = Object.values(binaries)[0]

await $`mkdir -p ./dist/${pkg.name}`
await $`mkdir -p ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await Bun.file("../../LICENSE").text())
await Bun.file(`./dist/${pkg.name}/bin/${pkg.name}.exe`).write(
  [
    `echo "Error: ${pkg.name}'s postinstall script was not run." >&2`,
    'echo "" >&2',
    'echo "This occurs when using --ignore-scripts during installation, or when using a" >&2',
    'echo "package manager like pnpm that does not run postinstall scripts by default." >&2',
    'echo "" >&2',
    'echo "To fix this, run the postinstall script manually:" >&2',
    `echo "  cd node_modules/${pkg.name} && node postinstall.mjs" >&2`,
    'echo "" >&2',
    `echo "Or reinstall ${pkg.name} without the --ignore-scripts flag." >&2`,
    "exit 1",
    "",
  ].join("\n"),
)

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: {
        [pkg.name]: `./bin/${pkg.name}.exe`,
      },
      scripts: {
        postinstall: "node ./postinstall.mjs",
      },
      version: version,
      license: pkg.license,
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

const tasks = Object.entries(binaries).map(async ([name]) => {
  await publish(`./dist/${name}`, name, binaries[name])
})
await Promise.all(tasks)
await publish(`./dist/${pkg.name}`, pkg.name, version)

const image = process.env.IMAGE_REPO ?? "ghcr.io/hexonal/entrox"
const platforms = "linux/amd64,linux/arm64"
const tags = [`${image}:${version}`, `${image}:${Script.channel}`]
const tagFlags = tags.flatMap((t) => ["-t", t])

// registries
if (!Script.preview) {
  await $`docker buildx build --platform ${platforms} ${tagFlags} --push .`
  // Calculate SHA values
  const arm64Sha = await $`sha256sum ./dist/${binaryName}-linux-arm64.tar.gz | cut -d' ' -f1`
    .text()
    .then((x) => x.trim())
  const x64Sha = await $`sha256sum ./dist/${binaryName}-linux-x64.tar.gz | cut -d' ' -f1`.text().then((x) => x.trim())
  const macX64Sha = await $`sha256sum ./dist/${binaryName}-darwin-x64.zip | cut -d' ' -f1`.text().then((x) => x.trim())
  const macArm64Sha = await $`sha256sum ./dist/${binaryName}-darwin-arm64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim())

  // The Windows signing job uploads signed unpacked directories as artifacts.
  // Repack here so Scoop hashes match the signed release assets.
  await $`rm -f ./dist/${binaryName}-windows-arm64.zip ./dist/${binaryName}-windows-x64-baseline.zip`
  await $`zip -r ../../${binaryName}-windows-arm64.zip *`.cwd(`dist/${binaryName}-windows-arm64/bin`)
  await $`zip -r ../../${binaryName}-windows-x64-baseline.zip *`.cwd(`dist/${binaryName}-windows-x64-baseline/bin`)
  const winArm64Sha = await $`sha256sum ./dist/${binaryName}-windows-arm64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim())
  const winX64BaselineSha = await $`sha256sum ./dist/${binaryName}-windows-x64-baseline.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim())

  const [pkgver, _subver = ""] = Script.version.split(/(-.*)/, 2)

  // arch
  const binaryPkgbuild = [
    "# Maintainer: dax",
    "# Maintainer: adam",
    "",
    `pkgname='${binaryName}-bin'`,
    `pkgver=${pkgver}`,
    `_subver=${_subver}`,
    "options=('!debug' '!strip')",
    "pkgrel=1",
    `pkgdesc='${Brand.product} CLI'`,
    `url='${Brand.websiteURL}'`,
    "arch=('aarch64' 'x86_64')",
    "license=('MIT')",
    `provides=('${binaryName}')`,
    `conflicts=('${binaryName}')`,
    "depends=('ripgrep')",
    "",
    `source_aarch64=("\${pkgname}_\${pkgver}_aarch64.tar.gz::https://github.com/${releaseRepo}/releases/download/v\${pkgver}\${_subver}/${binaryName}-linux-arm64.tar.gz")`,
    `sha256sums_aarch64=('${arm64Sha}')`,

    `source_x86_64=("\${pkgname}_\${pkgver}_x86_64.tar.gz::https://github.com/${releaseRepo}/releases/download/v\${pkgver}\${_subver}/${binaryName}-linux-x64.tar.gz")`,
    `sha256sums_x86_64=('${x64Sha}')`,
    "",
    "package() {",
    `  install -Dm755 ./${binaryName} "\${pkgdir}/usr/bin/${binaryName}"`,
    "}",
    "",
  ].join("\n")

  for (const [pkg, pkgbuild] of [[`${binaryName}-bin`, binaryPkgbuild]]) {
    for (let i = 0; i < 30; i++) {
      try {
        await $`rm -rf ./dist/aur-${pkg}`
        await $`git clone ssh://aur@aur.archlinux.org/${pkg}.git ./dist/aur-${pkg}`
        await $`cd ./dist/aur-${pkg} && git checkout master`
        await Bun.file(`./dist/aur-${pkg}/PKGBUILD`).write(pkgbuild)
        await $`cd ./dist/aur-${pkg} && makepkg --printsrcinfo > .SRCINFO`
        await $`cd ./dist/aur-${pkg} && git add PKGBUILD .SRCINFO`
        if ((await $`cd ./dist/aur-${pkg} && git diff --cached --quiet`.nothrow()).exitCode === 0) break
        await $`cd ./dist/aur-${pkg} && git commit -m "Update to v${Script.version}"`
        await $`cd ./dist/aur-${pkg} && git push`
        break
      } catch {
        continue
      }
    }
  }

  // Homebrew formula
  const homebrewFormula = [
    "# typed: false",
    "# frozen_string_literal: true",
    "",
    "# This file was generated by the Entrox release workflow. DO NOT EDIT.",
    "class Entrox < Formula",
    `  desc "${Brand.product} CLI"`,
    `  homepage "${Brand.websiteURL}"`,
    `  version "${Script.version.split("-")[0]}"`,
    "",
    `  depends_on "ripgrep"`,
    "",
    "  on_macos do",
    "    if Hardware::CPU.intel?",
    `      url "https://github.com/${releaseRepo}/releases/download/v${Script.version}/${binaryName}-darwin-x64.zip"`,
    `      sha256 "${macX64Sha}"`,
    "",
    "      def install",
    `        bin.install "${binaryName}"`,
    "      end",
    "    end",
    "    if Hardware::CPU.arm?",
    `      url "https://github.com/${releaseRepo}/releases/download/v${Script.version}/${binaryName}-darwin-arm64.zip"`,
    `      sha256 "${macArm64Sha}"`,
    "",
    "      def install",
    `        bin.install "${binaryName}"`,
    "      end",
    "    end",
    "  end",
    "",
    "  on_linux do",
    "    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?",
    `      url "https://github.com/${releaseRepo}/releases/download/v${Script.version}/${binaryName}-linux-x64.tar.gz"`,
    `      sha256 "${x64Sha}"`,
    "      def install",
    `        bin.install "${binaryName}"`,
    "      end",
    "    end",
    "    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?",
    `      url "https://github.com/${releaseRepo}/releases/download/v${Script.version}/${binaryName}-linux-arm64.tar.gz"`,
    `      sha256 "${arm64Sha}"`,
    "      def install",
    `        bin.install "${binaryName}"`,
    "      end",
    "    end",
    "  end",
    "end",
    "",
    "",
  ].join("\n")

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error("GITHUB_TOKEN is required to update homebrew tap")
    process.exit(1)
  }
  const tap = `https://x-access-token:${token}@github.com/${homebrewTapRepo}.git`
  await $`rm -rf ./dist/homebrew-tap`
  await $`git clone ${tap} ./dist/homebrew-tap`
  await $`mkdir -p ./dist/homebrew-tap/Formula`
  await Bun.file(`./dist/homebrew-tap/Formula/${binaryName}.rb`).write(homebrewFormula)
  await $`cd ./dist/homebrew-tap && git add Formula/${binaryName}.rb`
  if ((await $`cd ./dist/homebrew-tap && git diff --cached --quiet`.nothrow()).exitCode !== 0) {
    await $`cd ./dist/homebrew-tap && git commit -m "Update to v${Script.version}"`
    await $`cd ./dist/homebrew-tap && git push origin HEAD:main`
  }

  // Scoop manifest
  const scoopManifest = {
    version: Script.version,
    description: `${Brand.product} CLI`,
    homepage: Brand.websiteURL,
    license: "MIT",
    architecture: {
      "64bit": {
        url: `https://github.com/${releaseRepo}/releases/download/v${Script.version}/${binaryName}-windows-x64-baseline.zip`,
        hash: winX64BaselineSha,
      },
      arm64: {
        url: `https://github.com/${releaseRepo}/releases/download/v${Script.version}/${binaryName}-windows-arm64.zip`,
        hash: winArm64Sha,
      },
    },
    bin: `${binaryName}.exe`,
  }

  const bucket = `https://x-access-token:${token}@github.com/${scoopBucketRepo}.git`
  await $`rm -rf ./dist/scoop-bucket`
  await $`git clone ${bucket} ./dist/scoop-bucket`
  await $`mkdir -p ./dist/scoop-bucket/bucket`
  await Bun.file(`./dist/scoop-bucket/bucket/${binaryName}.json`).write(JSON.stringify(scoopManifest, null, 2) + "\n")
  await $`cd ./dist/scoop-bucket && git add bucket/${binaryName}.json`
  if ((await $`cd ./dist/scoop-bucket && git diff --cached --quiet`.nothrow()).exitCode !== 0) {
    await $`cd ./dist/scoop-bucket && git commit -m "Update to v${Script.version}"`
    await $`cd ./dist/scoop-bucket && git push origin HEAD:main`
  }
}
