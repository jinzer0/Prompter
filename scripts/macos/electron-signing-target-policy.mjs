import { realpath } from "node:fs/promises"
import { join, relative, sep } from "node:path"

import {
  hasExpectedRuntimeNativeTarget,
  runtimePackageRootIssues,
} from "./runtime-native-policy.mjs"
import { SigningInputError } from "./signing-discovery.mjs"

const frameworkNames = ["Electron Framework", "Mantle", "ReactiveObjC", "Squirrel"]
const helperNames = [
  "Prompter Helper",
  "Prompter Helper (Renderer)",
  "Prompter Helper (GPU)",
  "Prompter Helper (Plugin)",
]
const electronFrameworkFiles = [
  "Electron Framework",
  "Helpers/chrome_crashpad_handler",
  "Libraries/libEGL.dylib",
  "Libraries/libGLESv2.dylib",
  "Libraries/libffmpeg.dylib",
  "Libraries/libvk_swiftshader.dylib",
]
const addonPath =
  "Contents/Resources/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
const electron43TargetManifest = Object.freeze(
  [
    { path: "Contents/MacOS/Prompter", kind: "executable-host", entitlements: true },
    ...helperNames.flatMap((name) => [
      { path: `Contents/Frameworks/${name}.app`, kind: "helper-app", entitlements: true },
      {
        path: `Contents/Frameworks/${name}.app/Contents/MacOS/${name}`,
        kind: "executable-host",
        entitlements: true,
      },
    ]),
    ...frameworkNames.map((name) => ({
      path: `Contents/Frameworks/${name}.framework`,
      kind: "framework",
      entitlements: false,
    })),
    ...electronFrameworkFiles.map((path) => ({
      path: `Contents/Frameworks/Electron Framework.framework/Versions/Current/${path}`,
      kind: "dynamic-library",
      entitlements: false,
    })),
    ...["Mantle", "ReactiveObjC", "Squirrel"].map((name) => ({
      path: `Contents/Frameworks/${name}.framework/Versions/Current/${name}`,
      kind: "dynamic-library",
      entitlements: false,
    })),
    {
      path: "Contents/Frameworks/Squirrel.framework/Versions/Current/Resources/ShipIt",
      kind: "dynamic-library",
      entitlements: false,
    },
    { path: addonPath, kind: "native-module", entitlements: false },
  ].map(Object.freeze),
)

function normalizedPath(path) {
  return path.split(sep).join("/")
}

function isContained(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath)
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..")
}

async function currentFrameworkVersions(appPath) {
  const versions = new Map()
  for (const name of frameworkNames) {
    const frameworkPath = join(appPath, "Contents", "Frameworks", `${name}.framework`)
    try {
      versions.set(frameworkPath, await realpath(join(frameworkPath, "Versions", "Current")))
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue
      throw error
    }
  }
  return versions
}

function normalizedDescriptor(appPath, target, versions) {
  for (const [frameworkPath, versionPath] of versions) {
    if (!isContained(versionPath, target.path)) continue
    const suffix = normalizedPath(relative(versionPath, target.path))
    const frameworkRelativePath = normalizedPath(relative(appPath, frameworkPath))
    return {
      path: `${frameworkRelativePath}/Versions/Current${suffix === "" ? "" : `/${suffix}`}`,
      kind: target.kind,
      entitlements: target.entitlements,
    }
  }
  return {
    path: normalizedPath(relative(appPath, target.path)),
    kind: target.kind,
    entitlements: target.entitlements,
  }
}

function sorted(values) {
  return [...new Set(values)].sort((left, right) => (left === right ? 0 : left < right ? -1 : 1))
}

function mismatchError(missingTargets, unexpectedTargets, mismatchedTargets) {
  const error = new SigningInputError("App signing target manifest mismatch")
  error.code = "APP_SIGNING_TARGET_MANIFEST_MISMATCH"
  error.missingTargets = sorted(missingTargets)
  error.unexpectedTargets = sorted(unexpectedTargets)
  error.mismatchedTargets = sorted(mismatchedTargets)
  return error
}

export async function validateRuntimePackageRootClosure(appPath) {
  const issues = await runtimePackageRootIssues(appPath)
  if (issues.missing.length + issues.unexpected.length + issues.mismatched.length > 0)
    throw mismatchError(issues.missing, issues.unexpected, issues.mismatched)
}

export async function validateElectronSigningTargetManifest({ appPath, targets }) {
  const expected = new Map(electron43TargetManifest.map((target) => [target.path, target]))
  const versions = await currentFrameworkVersions(appPath)
  const discovered = new Map()
  const unexpectedTargets = []
  for (const target of targets) {
    const descriptor = normalizedDescriptor(appPath, target, versions)
    if (discovered.has(descriptor.path)) unexpectedTargets.push(descriptor.path)
    discovered.set(descriptor.path, descriptor)
  }
  for (const path of discovered.keys()) if (!expected.has(path)) unexpectedTargets.push(path)
  const missingTargets = []
  const mismatchedTargets = []
  const rootIssues = await runtimePackageRootIssues(appPath)
  missingTargets.push(...rootIssues.missing)
  unexpectedTargets.push(...rootIssues.unexpected)
  mismatchedTargets.push(...rootIssues.mismatched)
  for (const [path, descriptor] of expected) {
    const discoveredTarget = discovered.get(path)
    if (discoveredTarget === undefined) missingTargets.push(path)
    else if (
      descriptor.kind !== discoveredTarget.kind ||
      descriptor.entitlements !== discoveredTarget.entitlements
    ) {
      mismatchedTargets.push(path)
    }
  }
  if (!(await hasExpectedRuntimeNativeTarget({ appPath, targets }))) {
    if (!missingTargets.includes(addonPath) && !mismatchedTargets.includes(addonPath))
      mismatchedTargets.push(addonPath)
  }
  if (missingTargets.length + unexpectedTargets.length + mismatchedTargets.length > 0) {
    throw mismatchError(missingTargets, unexpectedTargets, mismatchedTargets)
  }
}
