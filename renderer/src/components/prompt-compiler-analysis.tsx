import type { PromptCompilerAnalyzeOutput } from "../../../electron/ipc-types"
import type { ClarificationAnswersById } from "../lib/prompt-compiler/llm-compiler-flow"
import type { CompiledPromptResult } from "../lib/prompt-compiler/types"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Textarea } from "./ui/textarea"

type PromptCompilerAnalysisProps = {
  readonly analysis: PromptCompilerAnalyzeOutput | null
  readonly answers: ClarificationAnswersById
  readonly compiled: CompiledPromptResult | null
  readonly onAnswerChange: (questionId: string, answer: string) => void
  readonly onSuggestedTagChange: (tagName: string, isSelected: boolean) => void
  readonly selectedSuggestedTags: readonly string[]
}

function InlineList({
  label,
  items,
}: {
  readonly label: string
  readonly items: readonly string[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      <p className="font-mono text-[11px] text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="neutral">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export function PromptCompilerAnalysis({
  analysis,
  answers,
  compiled,
  onAnswerChange,
  onSuggestedTagChange,
  selectedSuggestedTags,
}: PromptCompilerAnalysisProps) {
  if (
    analysis === null &&
    compiled?.warnings === undefined &&
    compiled?.suggestedTags === undefined
  ) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM analysis</CardTitle>
        <CardDescription>
          Review detected intent, answer material questions, then generate the final prompt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis !== null && (
          <div className="space-y-3">
            <p className="text-[12px] leading-5 text-muted-strong">{analysis.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">{scenarioLabel(analysis.detectedScenario)}</Badge>
              <Badge variant="accent">{targetAgentLabel(analysis.detectedTargetAgent)}</Badge>
              <Badge variant="neutral">Risk: {analysis.riskLevel}</Badge>
            </div>
            <InlineList label="assumptions" items={analysis.assumptions} />
            <InlineList label="suggested_tags" items={analysis.suggestedTags} />
            {analysis.questions.map((question) => (
              <section
                key={question.id}
                className="space-y-2 rounded-card border border-border p-3"
              >
                <div className="space-y-1">
                  <p className="text-[12px] font-medium text-foreground">{question.question}</p>
                  <p className="text-[12px] leading-5 text-muted">{question.whyItMatters}</p>
                </div>
                {question.options !== undefined && question.options.length > 0 && (
                  <InlineList label="options" items={question.options} />
                )}
                <Textarea
                  aria-label={`Answer for ${question.id}`}
                  className="min-h-24"
                  value={answers[question.id] ?? ""}
                  placeholder="Answer this clarification"
                  onChange={(event) => onAnswerChange(question.id, event.currentTarget.value)}
                />
              </section>
            ))}
          </div>
        )}
        {compiled !== null && (
          <div className="space-y-2 border-t border-border-subtle pt-3">
            {compiled.summary !== undefined && (
              <p className="text-[12px] leading-5 text-muted-strong">{compiled.summary}</p>
            )}
            <p className="font-mono text-[11px] text-muted-strong">
              Quality score: {compiled.qualityScore}
            </p>
            {compiled.suggestedTags !== undefined && compiled.suggestedTags.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-muted">suggested_tags</p>
                <div className="flex flex-wrap gap-2">
                  {compiled.suggestedTags.map((tag) => (
                    <label
                      key={tag}
                      className="inline-flex min-h-[22px] items-center gap-2 rounded-full border border-border bg-panel-muted px-2.5 text-[11px] font-medium text-muted-strong"
                    >
                      <input
                        aria-label={`Save tag ${tag}`}
                        checked={selectedSuggestedTags.includes(tag)}
                        className="accent-accent"
                        type="checkbox"
                        onChange={(event) => onSuggestedTagChange(tag, event.currentTarget.checked)}
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <InlineList label="warnings" items={compiled.warnings ?? []} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
