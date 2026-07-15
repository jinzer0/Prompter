import type { PromptTemplate } from "../../../electron/ipc-types"
import type {
  TemplateRenderResult,
  TemplateValues,
} from "../lib/prompt-templates/prompt-template-utils"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Select } from "./ui/select"

type PromptTemplateSelectorProps = {
  readonly isConfirmationPending: boolean
  readonly pendingTemplate: PromptTemplate | null
  readonly preview: TemplateRenderResult | null
  readonly templates: readonly PromptTemplate[]
  readonly variableNames: readonly string[]
  readonly variableValues: TemplateValues
  readonly onCancelApply: () => void
  readonly onConfirmApply: () => void
  readonly onPreview: () => void
  readonly onRequestApply: () => void
  readonly onSelectTemplate: (template: PromptTemplate | null) => void
  readonly onVariableChange: (name: string, value: string) => void
}

export function PromptTemplateSelector({
  isConfirmationPending,
  pendingTemplate,
  preview,
  templates,
  variableNames,
  variableValues,
  onCancelApply,
  onConfirmApply,
  onPreview,
  onRequestApply,
  onSelectTemplate,
  onVariableChange,
}: PromptTemplateSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt Template Apply</CardTitle>
        <CardDescription>Preview rendered template text, then explicitly apply it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          aria-label="Prompt template"
          value={pendingTemplate?.id ?? ""}
          onChange={(event) => {
            const template = templates.find((item) => item.id === event.currentTarget.value) ?? null
            onSelectTemplate(template)
          }}
        >
          <option value="">No prompt template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>

        {variableNames.map((name) => (
          <Input
            key={name}
            aria-label={`Template variable ${name}`}
            placeholder={`{{${name}}}`}
            value={variableValues[name] ?? ""}
            onChange={(event) => onVariableChange(name, event.currentTarget.value)}
          />
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pendingTemplate === null}
            onClick={onPreview}
          >
            Preview Prompt Template
          </Button>
          <Button size="sm" disabled={pendingTemplate === null} onClick={onRequestApply}>
            Apply Prompt Template
          </Button>
        </div>

        {preview !== null && (
          <div className="space-y-2 rounded-card border border-border-subtle bg-panel-muted p-3">
            <p className="font-mono text-[11px] text-muted">prompt_template_preview</p>
            <pre className="whitespace-pre-wrap text-[12px] leading-5 text-muted-strong">
              {preview.rendered}
            </pre>
            {preview.warnings.map((warning) => (
              <p key={warning} className="text-[12px] text-muted">
                {warning}
              </p>
            ))}
          </div>
        )}

        {isConfirmationPending && (
          <div className="space-y-2 rounded-card border border-border bg-panel-muted p-3">
            <p className="text-[13px] font-medium text-muted-strong">
              Apply rendered template to compiled prompt preview?
            </p>
            <p className="text-[12px] leading-5 text-muted">
              This replaces only the editable compiled output. Original request stays unchanged.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onCancelApply}>
                Cancel Apply
              </Button>
              <Button size="sm" onClick={onConfirmApply}>
                Confirm Apply Prompt Template
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
