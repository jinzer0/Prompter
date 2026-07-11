import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

type PromptCompilerClipboardImportCardProps = {
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export function PromptCompilerClipboardImportCard({
  onCancel,
  onConfirm,
}: PromptCompilerClipboardImportCardProps) {
  return (
    <Card className="bg-panel-muted">
      <CardHeader>
        <CardTitle>Replace the current original request with clipboard text?</CardTitle>
        <CardDescription>
          Current compiler draft details will stay unchanged until you confirm.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onConfirm}>
            Replace original request
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
