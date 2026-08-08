import { Textarea } from "./ui/textarea"

type CompiledPromptPreviewProps = {
  readonly canEditOutput: boolean
  readonly guardDescriptionId: string
  readonly value: string
  readonly onChange: (value: string) => void
}

export function CompiledPromptPreview({
  canEditOutput,
  guardDescriptionId,
  value,
  onChange,
}: CompiledPromptPreviewProps) {
  return (
    <section className="space-y-2" aria-labelledby="compiled-preview-heading">
      <h3 id="compiled-preview-heading" className="font-mono text-[11px] text-muted">
        compiled_prompt preview
      </h3>
      <Textarea
        readOnly={!canEditOutput}
        aria-describedby={canEditOutput ? undefined : guardDescriptionId}
        aria-label="Generated prompt preview"
        className="min-h-64"
        placeholder="Compile a prompt to preview the static template output."
        value={value}
        variant="preview"
        onChange={(event) => {
          if (canEditOutput) {
            onChange(event.currentTarget.value)
          }
        }}
      />
    </section>
  )
}
