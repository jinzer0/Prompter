export function createFilesystemProbe(actual, state) {
  function labelFor(path) {
    const text = String(path)
    if (text.endsWith(".notarization-submit.claim")) return "claim final"
    if (text.includes(".notarization-submit.claim.") && text.endsWith(".tmp")) {
      return "claim temp"
    }
    if (text.includes(".notarization-submit.reclaim.") && text.endsWith(".tmp")) {
      return "guard temp"
    }
    return text.endsWith(".tmp") ? "temp" : undefined
  }

  function event(label, action) {
    if (label === "temp" && action !== "write") return `file ${action}`
    return `${label} ${action}`
  }

  function observeHandle(handle, label, isDirectory) {
    return new Proxy(handle, {
      get(target, property) {
        if (property === "writeFile") {
          return async (...arguments_) => {
            state.events.push(event(label, "write"))
            return target.writeFile(...arguments_)
          }
        }
        if (property === "sync") {
          return async () => {
            state.events.push(isDirectory ? "directory sync" : event(label, "sync"))
            const failure = isDirectory
              ? state.directorySyncFailure?.(state.latestPublication)
              : undefined
            if (failure !== undefined) throw failure
            return target.sync()
          }
        }
        if (property === "close") {
          return async () => {
            state.events.push(isDirectory ? "directory close" : event(label, "close"))
            if (isDirectory) return target.close()
            state.latestPublication = label
            const failure = state.fileCloseFailure?.(label)
            await target.close()
            if (failure !== undefined) throw failure
          }
        }
        const value = Reflect.get(target, property, target)
        return typeof value === "function" ? value.bind(target) : value
      },
    })
  }

  return {
    link: async (sourcePath, targetPath) => {
      if (String(targetPath).endsWith(".notarization-submit.claim")) {
        state.events.push("claim publication")
      }
      return actual.link(sourcePath, targetPath)
    },
    open: async (path, flags, mode) => {
      const handle =
        mode === undefined ? await actual.open(path, flags) : await actual.open(path, flags, mode)
      const text = String(path)
      if (flags === "r" && state.directories.has(text)) {
        state.events.push('directory open("r")')
        return observeHandle(handle, "directory", true)
      }
      const label = labelFor(path)
      if (flags === "wx" && label === "claim final") state.events.push("claim final publication")
      if (flags === "wx" && label === "claim temp") state.events.push("claim temp create")
      return label === undefined ? handle : observeHandle(handle, label, false)
    },
  }
}
