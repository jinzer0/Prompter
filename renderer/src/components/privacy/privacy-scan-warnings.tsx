type PrivacyScanWarningsProps = {
  readonly warnings: readonly string[]
}

export function PrivacyScanWarnings({ warnings }: PrivacyScanWarningsProps) {
  if (warnings.length === 0) return null

  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-card border border-border bg-panel-muted p-2 text-[12px] leading-5 text-muted-strong"
        >
          {warning}
        </p>
      ))}
    </div>
  )
}
