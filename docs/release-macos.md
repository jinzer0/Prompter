# macOS Signed Release Guide

This guide is for maintainers preparing the Prompter v0.1.1 ARM64 macOS release. It documents
the signed release path added for Issue #6. It does not publish a GitHub Release, create or move
tags, upload assets, or replace the public v0.1.0 download notice.

## Release Boundary

Prompter has two macOS packaging paths.

- `npm run package` builds the app, then creates unsigned local outputs in `release/` for the
  current supported local architecture.
- `npm run make` is the same unsigned local path because it calls `npm run package`.
- `npm run package:release:macos` first runs `scripts/macos/release-version-preflight.mjs`, then
  builds, then runs the signed release coordinator through `scripts/release-macos.mjs`.

The signed path requires exact version `0.1.1` before build, native rebuild, bundling, Apple
preflight, candidate creation, or evidence writes. It is ARM64 only. The coordinator then requires
the candidate directory to be absent and preflights the current platform, architecture, clean Git
worktree, selected Xcode installation, signing identity, unlocked Keychain, notary profile, and
Apple notary connectivity before it reserves or mutates the release candidate. It reads only these two
non-secret variable names from the environment:

- `PROMPTER_SIGNING_IDENTITY`
- `PROMPTER_NOTARY_PROFILE`

Set those values in your shell or password manager session before running the release command.
Don't write their values into docs, scripts, tracked files, screenshots, terminal transcripts,
issue comments, or evidence.

## Xcode Requirement

Use a full Xcode installation, not only the Command Line Tools. Select it before the release and
verify both commands:

```bash
sudo /usr/bin/xcode-select --switch /Applications/Xcode.app/Contents/Developer
/usr/bin/xcode-select -p
/usr/bin/xcodebuild -version
```

The selected developer directory must end in `Xcode.app/Contents/Developer`, and
`xcodebuild -version` must report Xcode. The release coordinator performs the same check with
standard system commands before it assembles or signs anything.

## Signing Identity Requirement

Prepare a valid Developer ID Application certificate and its matching private key in the login
Keychain. The release path expects one exact signing identity to be available. If the identity is
missing, duplicated, malformed, or unavailable because the Keychain is locked, the release stops
before app assembly.

Verify identity availability without copying the identity value into tracked notes:

```bash
/usr/bin/security find-identity -v -p codesigning
/usr/bin/security show-keychain-info
```

The coordinator signs nested code first, helper apps next, and the outer `Prompter.app` last. App
verification uses strict code-signing checks after signing. DMG verification uses a strict
signature check after the image is signed.

## Notary Profile Requirement

Create a named `notarytool` Keychain profile ahead of the release. Use Apple's
`xcrun notarytool store-credentials` workflow interactively or through your local secret manager,
then keep the profile name outside tracked files except through `PROMPTER_NOTARY_PROFILE`.

Verify the stored profile can reach Apple's notary service before release:

```bash
/usr/bin/xcrun notarytool history --keychain-profile "${PROMPTER_NOTARY_PROFILE}" --output-format json
```

The release path uses Keychain profile authentication only. It doesn't accept Apple account
values, app-specific passwords, API key file paths, raw private key content, or ad hoc
authentication flags.

## Signed Release Command

Run the signed release only from a clean ARM64 macOS worktree after the required variables are
already present in the shell:

```bash
npm run package:release:macos
```

The command fails closed. A failure means no publication, no partial allowlist, no tag command,
and no release command. Immutable release tags are never rewritten to hide or replace a failed
candidate.

### Trusted path anchor

The parent directory of the configured source root is the trusted path anchor for local release
and notarization evidence directories. The coordinator resolves that anchor once, then requires
every path component below it to be a real directory rather than a symbolic link before creating
or recursively removing data. A symbolic link at or above the trusted anchor, including the macOS
`/var` to `/private/var` platform alias, is resolved and does not by itself invalidate the release.
Configured release or evidence paths outside the anchor, or beneath a symbolic-link component
inside the owned tree, fail before Apple commands or outside-tree mutation.

## Notarization Flow

The coordinator submits two different artifacts to Apple:

1. A temporary ZIP containing `Prompter.app` is created outside the final candidate directory and
   submitted first.
2. The final DMG is created from the stapled app, signed, then submitted separately.

The temporary app ZIP is never stapled. The raw `.app` bundle is never uploaded directly. The app
and the DMG each require an `Accepted` status and a reviewed notary log with no warnings and no
errors before the next release step can run.

Each submission gate is strict: `Accepted` plus an empty issues array or only exact lowercase `info` issue records.

Evidence is stored under ignored local paths beneath `.omo/evidence/release-macos/v0.1.1/app` and
`.omo/evidence/release-macos/v0.1.1/dmg`. Each resume and final receipt binds `submissionId`,
`artifactKind`, and `artifactSha256`; final evidence also records `Accepted` and warning-free,
error-free issues. It must not contain identity values, profile values, private keys, credential
values, local key paths, full environment dumps, or raw notary payloads.

`notarytool submit` returns an acknowledgement UUID, which is saved as artifact-bound state before
bounded `notarytool info` polling and log retrieval. If polling or log retrieval fails, resume with
`notarytool info` and `notarytool log` through the same Keychain profile, not by submitting the same
bytes again. A cached accepted
receipt is not trusted alone: every continuation refreshes Apple status and log before staple,
Gatekeeper, final archive, checksum, or publication-adjacent work. The refreshed state must be
`Accepted` with warning-free, error-free issues before stapling or packaging continues.

## Final Artifact Contract

The final release candidate directory is `release/v0.1.1/`. On success it may contain exactly
these files:

- `Prompter-0.1.1-mac-arm64.zip`
- `Prompter-0.1.1-mac-arm64.dmg`
- `SHA256SUMS`

The final ZIP is created only after the app is stapled and validated. It is extracted into a clean
temporary directory and the contained app is verified before the DMG is created. The DMG is
verified, signed, submitted, stapled, validated, assessed by Gatekeeper, mounted read-only, and
checked for a contained `Prompter.app`. `SHA256SUMS` is written last, after ZIP and DMG validation
pass.

Do not add extra files to `release/v0.1.1/`. The candidate directory must be absent before the
signed command starts. If it already exists or contains unexpected files after a run, remove it only
after you understand its owner and after you've confirmed no other task needs it.

## Publication Boundary

Issue #6 prepares the signed release path but doesn't publish it. Issue #7 owns the actual
Apple-backed release run, final asset review, GitHub Release creation, tag creation, upload, and
public README installation update. Until Issue #7 completes, the public README must continue to
point users at v0.1.0 and must keep the unsigned-user notice truthful.

Never rewrite an immutable tag. If a published release candidate is wrong, stop and create a new
approved release action instead of editing history.

## Maintainer Checklist

Before running the signed command:

- Confirm `git status --short` is empty.
- Confirm `release/v0.1.1/` is absent. An empty version-specific candidate directory is unavailable.
- Confirm full Xcode is selected and `xcodebuild -version` reports Xcode.
- Confirm exactly one prepared Developer ID Application identity and matching private key are
  available in Keychain.
- Confirm the named notarytool Keychain profile passes `history`.
- Confirm the network path to Apple's notary service is available.
- Confirm no release, tag, or upload command will run as part of Issue #6.

After the command succeeds, run the signed-release section in `docs/qa-checklist.md`. Publish
nothing until those checks pass and Issue #7 has explicit approval.
