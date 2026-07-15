import type { PromptTemplateProvenance } from "../lib/prompt-compiler/types"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

type PromptTemplateProvenancePanelProps = {
  readonly derivedPromptSourceTitle: string | null
  readonly provenance: PromptTemplateProvenance | null
  readonly onClearProvenance: () => void
}

export function PromptTemplateProvenancePanel({
  derivedPromptSourceTitle,
  provenance,
  onClearProvenance,
}: PromptTemplateProvenancePanelProps) {
  if (provenance === null && derivedPromptSourceTitle === null) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft provenance</CardTitle>
        <CardDescription>Local source markers for this compiler draft.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {derivedPromptSourceTitle !== null && (
          <p className="text-[12px] leading-5 text-muted-strong">
            Derived draft seeded from {derivedPromptSourceTitle}. Saving uses the derivation bridge.
          </p>
        )}
        {provenance !== null && (
          <div className="space-y-2">
            <p className="text-[12px] leading-5 text-muted-strong">
              Applied prompt template: {provenance.templateName}
            </p>
            <Button size="sm" variant="ghost" onClick={onClearProvenance}>
              Clear Template Provenance
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
