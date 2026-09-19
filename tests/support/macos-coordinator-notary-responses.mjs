import { appSubmissionId, dmgSubmissionId } from "./macos-coordinator-support.mjs"

export function xcrunResult({
  arguments_,
  pendingAppStatus,
  pendingDmgStatus,
  warningLog,
  notaryLog,
  notaryInfo,
}) {
  if (arguments_[1] === "history") return { stdout: "{}", stderr: "" }
  if (arguments_[1] === "submit")
    return {
      stdout: JSON.stringify({
        id: arguments_[2].endsWith(".dmg") ? dmgSubmissionId : appSubmissionId,
        status: "Accepted",
      }),
      stderr: "",
    }
  if (arguments_[1] === "info") {
    const artifactKind = arguments_[2] === dmgSubmissionId ? "dmg" : "app"
    const response = (typeof notaryInfo === "function" ? notaryInfo(artifactKind) : notaryInfo) ?? {
      id: artifactKind === "dmg" ? dmgSubmissionId : appSubmissionId,
      status:
        artifactKind === "dmg"
          ? (pendingDmgStatus ?? "Accepted")
          : (pendingAppStatus ?? "Accepted"),
    }
    return { stdout: JSON.stringify(response), stderr: "" }
  }
  if (arguments_[1] === "log")
    return {
      stdout: JSON.stringify(
        notaryLog ?? (warningLog ? { issues: [{ severity: "warning" }] } : { issues: [] }),
      ),
      stderr: "",
    }
  return { stdout: "", stderr: "" }
}
