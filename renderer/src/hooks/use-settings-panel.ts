import { useEffect, useState } from "react"

import type { OpenAIKeyStatus, SettingsDefaults } from "../../../electron/ipc-types"

export type DefaultsForm = {
  readonly defaultModel: string
  readonly defaultTargetAgent: SettingsDefaults["defaultTargetAgent"]
  readonly defaultProjectId: string
  readonly defaultScenario: SettingsDefaults["defaultScenario"]
  readonly appTheme: SettingsDefaults["appTheme"]
  readonly compilerDefaultLanguage: string
}

function defaultsToForm(defaults: SettingsDefaults): DefaultsForm {
  return {
    defaultModel: defaults.defaultModel,
    defaultTargetAgent: defaults.defaultTargetAgent,
    defaultProjectId: defaults.defaultProjectId ?? "",
    defaultScenario: defaults.defaultScenario,
    appTheme: defaults.appTheme,
    compilerDefaultLanguage: defaults.compilerDefaultLanguage,
  }
}

export function useSettingsPanel() {
  const [defaultsForm, setDefaultsForm] = useState<DefaultsForm | null>(null)
  const [keyStatus, setKeyStatus] = useState<OpenAIKeyStatus | null>(null)
  const [defaultsMessage, setDefaultsMessage] = useState<string | null>(null)
  const [keyMessage, setKeyMessage] = useState<string | null>(null)
  const [apiKey, setAPIKey] = useState("")
  const [isSavingDefaults, setIsSavingDefaults] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isDeletingKey, setIsDeletingKey] = useState(false)

  useEffect(() => {
    let isActive = true

    async function loadSettings(): Promise<void> {
      try {
        const [defaults, status] = await Promise.all([
          window.prompter.settings.getDefaults(),
          window.prompter.secrets.getOpenAIKeyStatus(),
        ])

        if (isActive) {
          setDefaultsForm(defaultsToForm(defaults))
          setKeyStatus(status)
        }
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }

        if (isActive) {
          setDefaultsMessage("Settings could not be loaded.")
          setKeyStatus({ hasKey: false, maskedKey: null, updatedAt: null })
        }
      }
    }

    void loadSettings()

    return () => {
      isActive = false
    }
  }, [])

  async function saveDefaults(form: DefaultsForm): Promise<void> {
    const defaultModel = form.defaultModel.trim()
    const compilerDefaultLanguage = form.compilerDefaultLanguage.trim()

    if (defaultModel.length === 0 || compilerDefaultLanguage.length === 0) {
      setDefaultsMessage("Default model and compiler language are required.")
      return
    }

    setIsSavingDefaults(true)
    setDefaultsMessage(null)

    try {
      const updated = await window.prompter.settings.updateDefaults({
        defaultModel,
        defaultTargetAgent: form.defaultTargetAgent,
        defaultProjectId:
          form.defaultProjectId.trim().length === 0 ? null : form.defaultProjectId.trim(),
        defaultScenario: form.defaultScenario,
        appTheme: form.appTheme,
        compilerDefaultLanguage,
      })
      setDefaultsForm(defaultsToForm(updated))
      setDefaultsMessage("Settings defaults saved.")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setDefaultsMessage("Settings defaults could not be saved.")
    } finally {
      setIsSavingDefaults(false)
    }
  }

  async function saveKey(): Promise<void> {
    const trimmedKey = apiKey.trim()

    if (trimmedKey.length === 0) {
      setKeyMessage("API key is required.")
      return
    }

    setIsSavingKey(true)
    setKeyMessage(null)

    try {
      const status = await window.prompter.secrets.saveOpenAIKey({ apiKey: trimmedKey })
      setKeyStatus(status)
      setAPIKey("")
      setKeyMessage("OpenAI key saved.")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setAPIKey("")
      setKeyMessage("OpenAI key could not be saved.")
    } finally {
      setIsSavingKey(false)
    }
  }

  async function deleteKey(): Promise<void> {
    setIsDeletingKey(true)
    setKeyMessage(null)

    try {
      const status = await window.prompter.secrets.deleteOpenAIKey()
      setKeyStatus(status)
      setAPIKey("")
      setKeyMessage("OpenAI key removed.")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setKeyMessage("OpenAI key could not be removed.")
    } finally {
      setIsDeletingKey(false)
    }
  }

  return {
    apiKey,
    defaultsForm,
    defaultsMessage,
    deleteKey,
    isDeletingKey,
    isSavingDefaults,
    isSavingKey,
    keyMessage,
    keyStatus,
    saveDefaults,
    saveKey,
    setAPIKey,
    setDefaultsForm,
  }
}
