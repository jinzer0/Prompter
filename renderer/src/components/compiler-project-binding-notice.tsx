import {
  COMPILER_PROJECT_REBIND_DESCRIPTION_ID,
  type CompilerProjectBinding,
} from "../lib/compiler-project-binding"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"

type CompilerProjectBindingNoticeProps = {
  readonly binding: CompilerProjectBinding
  readonly projectName: string
  readonly onRebind: () => void
}

export function CompilerProjectBindingNotice({
  binding,
  projectName,
  onRebind,
}: CompilerProjectBindingNoticeProps) {
  if (binding.kind === "bound") {
    return null
  }

  return (
    <Card role="status">
      <CardContent className="grid min-w-0 gap-3 pt-4">
        <div className="min-w-0 space-y-2">
          <Badge variant="accent">Project binding required</Badge>
          <p
            id={COMPILER_PROJECT_REBIND_DESCRIPTION_ID}
            className="break-words text-[12px] leading-5 text-muted-strong"
          >
            Preserved compiler output belongs to another project. Analyze, compile, template, and
            save actions are paused for {projectName}. Copy works.
          </p>
        </div>
        <Button
          aria-label={`Rebind compiler to ${projectName}`}
          className="min-w-0 w-full"
          size="sm"
          onClick={onRebind}
        >
          Rebind compiler
        </Button>
      </CardContent>
    </Card>
  )
}
