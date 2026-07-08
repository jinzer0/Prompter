import { Textarea } from "./ui/textarea"

type CompiledPromptPreviewProps = {
  readonly value: string
  readonly onChange: (value: string) => void
}

export function CompiledPromptPreview({ value, onChange }: CompiledPromptPreviewProps) {
  return (
    <section className="space-y-2" aria-labelledby="compiled-preview-heading">
      <h3 id="compiled-preview-heading" className="font-mono text-[11px] text-muted">
        compiled_prompt preview
      </h3>
      <Textarea
        aria-label="Generated prompt preview"
        className="min-h-64"
        placeholder="Compile a prompt to preview the static template output."
        value={value}
        variant="preview"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </section>
  )
}
