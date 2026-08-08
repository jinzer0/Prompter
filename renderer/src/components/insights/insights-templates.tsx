import type { PromptTemplateInsight, TemplateInsights } from "../../../../electron/ipc-types"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { formatInsightCount, formatInsightLabel } from "./insights-format"
import {
  harnessTemplatesNavigation,
  type InsightsNavigate,
  promptTemplateNavigation,
} from "./insights-navigation-actions"
import { InsightListEmpty, InsightMetric, InsightPanel, InsightProgress } from "./insights-ui"

type PromptTemplateListProps = {
  readonly items: readonly PromptTemplateInsight[]
  readonly onNavigate: InsightsNavigate
  readonly title: string
}

function PromptTemplateList({ items, onNavigate, title }: PromptTemplateListProps) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h4 className="text-[12px] font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <InsightListEmpty>No matching prompt templates.</InsightListEmpty>
      ) : (
        <ul className="space-y-1">
          {items.map((template) => (
            <li key={`${title}-${template.promptTemplateId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-between gap-3 py-2 text-left"
                onClick={() => onNavigate(promptTemplateNavigation(template.promptTemplateId))}
              >
                <span className="min-w-0 truncate">{template.name}</span>
                <span className="text-muted">
                  {formatInsightCount(template.placeholderCount)} placeholders
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type TemplateInsightsPanelProps = {
  readonly insights: TemplateInsights
  readonly onNavigate: InsightsNavigate
  readonly projectFiltered: boolean
}

export function TemplateInsightsPanel({
  insights,
  onNavigate,
  projectFiltered,
}: TemplateInsightsPanelProps) {
  return (
    <InsightPanel
      headingId="insights-templates-heading"
      title="Templates"
      description="Prompt-template scope and global harness-template inventory."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="accent">
          Prompt templates · {projectFiltered ? "Selected project scope" : "All projects scope"}
        </Badge>
        <Badge>Harness templates · Global inventory</Badge>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <InsightMetric
          label="Prompt templates"
          value={formatInsightCount(insights.promptTemplateCount)}
        />
        <InsightMetric
          label="Harness templates"
          value={formatInsightCount(insights.harnessTemplateCount)}
        />
        <InsightMetric
          label="With source prompt"
          value={formatInsightCount(insights.sourcePromptTemplateCount)}
        />
        <InsightMetric
          label="Missing source"
          value={formatInsightCount(insights.missingSourcePromptTemplateCount)}
        />
        <InsightMetric
          label="Invalid harnesses"
          value={formatInsightCount(insights.invalidHarnessTemplateCount)}
        />
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate(promptTemplateNavigation(null))}
        >
          Open Prompt Templates
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate(harnessTemplatesNavigation())}
        >
          Open Harness Templates
        </Button>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="space-y-2" aria-label="Prompt templates by scenario">
          <h4 className="text-[12px] font-semibold text-foreground">
            Prompt templates by scenario
          </h4>
          <ul className="space-y-2">
            {insights.promptTemplatesByScenario.map((item) => (
              <InsightProgress
                key={item.scenario}
                label={formatInsightLabel(item.scenario)}
                percentage={item.percentage}
                details={`${formatInsightCount(item.count)} prompt templates`}
              />
            ))}
          </ul>
        </section>
        <section className="space-y-2" aria-label="Prompt templates by target agent">
          <h4 className="text-[12px] font-semibold text-foreground">Prompt templates by agent</h4>
          <ul className="space-y-2">
            {insights.promptTemplatesByTargetAgent.map((item) => (
              <InsightProgress
                key={item.targetAgent}
                label={formatInsightLabel(item.targetAgent)}
                percentage={item.percentage}
                details={`${formatInsightCount(item.count)} prompt templates`}
              />
            ))}
          </ul>
        </section>
        <PromptTemplateList
          title="Placeholder-heavy prompt templates"
          items={insights.placeholderHeavyPromptTemplates}
          onNavigate={onNavigate}
        />
        <PromptTemplateList
          title="Recent prompt templates"
          items={insights.recentPromptTemplates}
          onNavigate={onNavigate}
        />
        <section className="space-y-2" aria-label="Global harness templates by scenario">
          <h4 className="text-[12px] font-semibold text-foreground">
            Global harnesses by scenario
          </h4>
          <ul className="space-y-2">
            {insights.harnessTemplatesByScenario.map((item) => (
              <InsightProgress
                key={item.scenario}
                label={formatInsightLabel(item.scenario)}
                percentage={item.percentage}
                details={`${formatInsightCount(item.count)} global harness templates`}
              />
            ))}
          </ul>
        </section>
        <section className="space-y-2" aria-label="Global harness templates by target agent">
          <h4 className="text-[12px] font-semibold text-foreground">Global harnesses by agent</h4>
          <ul className="space-y-2">
            {insights.harnessTemplatesByTargetAgent.map((item) => (
              <InsightProgress
                key={item.targetAgent}
                label={formatInsightLabel(item.targetAgent)}
                percentage={item.percentage}
                details={`${formatInsightCount(item.count)} global harness templates`}
              />
            ))}
          </ul>
        </section>
      </div>
    </InsightPanel>
  )
}
