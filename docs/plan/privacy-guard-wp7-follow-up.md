# WP7 Privacy Confirmation IPC Follow-up

The main-process quality service now accepts an internal LLM review input:

```ts
{
  snapshot: PromptQualityReviewSnapshot
  privacyConfirmationSessionId?: string
}
```

WP7 must make that input available at the existing explicit LLM-review IPC boundary.

1. Replace `reviewPromptQualityWithLLMInputSchema = noPayloadSchema` with a strict object containing
   `snapshot: promptQualityReviewSnapshotSchema` and optional `privacyConfirmationSessionId`.
2. Update the typed bridge and preload exposure so `reviewWithLLM(input)` sends that object unchanged.
3. Parse and forward the input in `ipc-handlers.ts` to `reviewPromptQualityWithLLM(input)`.
4. Translate `PrivacyConfirmationRequiredError` into the existing masked confirmation-required contract,
   preserving only the session ID and scan result. Add an explicit cancellation route that calls the
   confirmation session store before retry is abandoned.
5. Keep no-input legacy IPC invocations compiling only during the transition. They intentionally return
   `llm_review_unavailable` without retrieving an API key because no exact review payload exists to scan.
6. Add contract and bridge coverage for confirmation, cancellation, replay, payload drift, and expiry.
