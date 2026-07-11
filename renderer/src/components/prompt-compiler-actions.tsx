import { Button } from "./ui/button"

type PromptCompilerActionsProps = {
  readonly canCopy: boolean
  readonly canSaveNextVersion: boolean
  readonly canSavePrompt: boolean
  readonly isAnalyzing: boolean
  readonly isCompilingLLM: boolean
  readonly isReadingClipboard: boolean
  readonly isSaving: boolean
  readonly isSavingNextVersion: boolean
  readonly onAnalyzeWithLLM: () => void
  readonly onCompileWithLLM: () => void
  readonly onCopyPrompt: () => void
  readonly onImportFromClipboard: () => Promise<void>
  readonly onSaveNextVersion: () => Promise<void>
  readonly onSavePrompt: () => Promise<void>
}

export function PromptCompilerActions({
  canCopy,
  canSaveNextVersion,
  canSavePrompt,
  isAnalyzing,
  isCompilingLLM,
  isReadingClipboard,
  isSaving,
  isSavingNextVersion,
  onAnalyzeWithLLM,
  onCompileWithLLM,
  onCopyPrompt,
  onImportFromClipboard,
  onSaveNextVersion,
  onSavePrompt,
}: PromptCompilerActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        data-menu-action-target="quick-capture-from-clipboard"
        type="button"
        variant="secondary"
        disabled={isReadingClipboard}
        onClick={() => void onImportFromClipboard()}
      >
        {isReadingClipboard ? "Reading Clipboard..." : "Import from Clipboard"}
      </Button>
      <Button type="submit">프롬프트 컴파일</Button>
      <Button
        type="button"
        variant="secondary"
        disabled={isAnalyzing || isCompilingLLM}
        onClick={onAnalyzeWithLLM}
      >
        {isAnalyzing ? "분석 중..." : "분석하기"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={isAnalyzing || isCompilingLLM}
        onClick={onCompileWithLLM}
      >
        {isCompilingLLM ? "생성 중..." : "최종 프롬프트 생성"}
      </Button>
      <Button
        data-menu-action-target="save-compiled-prompt"
        type="button"
        variant="secondary"
        disabled={!canSavePrompt || isSaving}
        onClick={() => void onSavePrompt()}
      >
        {isSaving ? "Saving..." : "Save compiled prompt"}
      </Button>
      {canSaveNextVersion && (
        <Button
          type="button"
          variant="secondary"
          disabled={isSavingNextVersion}
          onClick={() => void onSaveNextVersion()}
        >
          {isSavingNextVersion ? "Saving..." : "Save as new version"}
        </Button>
      )}
      <Button
        data-menu-action-target="copy-compiled-prompt"
        type="button"
        variant="ghost"
        disabled={!canCopy}
        onClick={() => void onCopyPrompt()}
      >
        Copy
      </Button>
    </div>
  )
}
