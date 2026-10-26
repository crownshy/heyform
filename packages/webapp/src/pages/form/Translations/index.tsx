import { htmlUtils } from '@heyform-inc/answer-utils'
import { CHOICES_FIELD_KINDS } from '@heyform-inc/shared-types-enums'
import { helper } from '@heyform-inc/utils'
import { observer } from 'mobx-react-lite'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, EmptyStates, Input, Select, notification } from '@/components/ui'
import { FORM_LOCALES_OPTIONS } from '@/consts'
import { FormService } from '@/service'
import { useStore } from '@/store'
import { useParam } from '@/utils'

import './style.scss'

interface FieldTranslation {
  title?: string
  description?: string
  choices?: Record<string, string>
}

function toPlain(value: any): string {
  if (helper.isEmpty(value)) {
    return ''
  }
  return htmlUtils.plain(helper.isArray(value) ? htmlUtils.serialize(value) : value)
}

const Translations: FC = () => {
  const { t } = useTranslation()
  const { formId } = useParam()
  const formStore = useStore('formStore')

  const languageOptions = useMemo(
    () =>
      FORM_LOCALES_OPTIONS.filter(option =>
        (formStore.current?.settings?.languages || []).includes(option.value)
      ),
    [formStore.current?.settings?.languages]
  )

  const [language, setLanguage] = useState<string | undefined>(languageOptions[0]?.value)
  const [edits, setEdits] = useState<Record<string, FieldTranslation>>({})
  const [saving, setSaving] = useState(false)

  const fields = formStore.current?.fields || []

  function getStored(fieldId: string): FieldTranslation {
    return (formStore.current?.translations?.[language!]?.[fieldId] as any) || {}
  }

  function getDisplay(fieldId: string): FieldTranslation {
    if (edits[fieldId]) {
      return edits[fieldId]
    }

    const stored = getStored(fieldId)
    return {
      title: toPlain(stored.title),
      description: toPlain(stored.description),
      choices: stored.choices
    }
  }

  function handleLanguageChange(value: string) {
    setLanguage(value)
    setEdits({})
  }

  function updateField(fieldId: string, updates: Partial<FieldTranslation>) {
    setEdits(prev => ({
      ...prev,
      [fieldId]: {
        ...getDisplay(fieldId),
        ...updates
      }
    }))
  }

  function updateChoice(fieldId: string, choiceId: string, label: string) {
    const current = getDisplay(fieldId)

    updateField(fieldId, {
      choices: {
        ...current.choices,
        [choiceId]: label
      }
    })
  }

  async function handleSave() {
    if (!language || helper.isEmpty(edits)) {
      return
    }

    setSaving(true)

    try {
      const payload: Record<string, any> = {}

      Object.keys(edits).forEach(fieldId => {
        const edit = edits[fieldId]

        payload[fieldId] = {
          title: htmlUtils.parse(edit.title || ''),
          description: htmlUtils.parse(edit.description || ''),
          choices: edit.choices
        }
      })

      await FormService.updateTranslations(formId, language, payload)

      formStore.update({
        translations: {
          ...formStore.current?.translations,
          [language]: {
            ...formStore.current?.translations?.[language],
            ...payload
          }
        }
      })

      setEdits({})
      notification.success({
        title: t('formSettings.formUpdated')
      })
    } finally {
      setSaving(false)
    }
  }

  if (helper.isEmpty(languageOptions)) {
    return (
      <div className="form-content-container">
        <div className="container mx-auto max-w-5xl">
          <EmptyStates
            title={t('formSettings.translationsEmptyTitle')}
            description={t('formSettings.translationsEmptyDescription')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="form-content-container form-translations">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-10 mt-14 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900">{t('form.translations')}</h1>
            <p className="text-sm text-slate-500">{t('formSettings.translationsSubTitle')}</p>
          </div>

          <Select
            native
            autoWidth
            options={languageOptions}
            value={language}
            onChange={handleLanguageChange}
          />
        </div>

        <div className="space-y-6 pb-24">
          {fields.map(field => {
            const translation = getDisplay(field.id)
            const originalTitle = toPlain(field.title)
            const originalDescription = toPlain(field.description)
            const hasDescription = helper.isValidArray(field.description)
            const choices = field.properties?.choices
            const showChoices = CHOICES_FIELD_KINDS.includes(field.kind) && helper.isValidArray(choices)

            return (
              <div key={field.id} className="translation-field">
                <div className="translation-field-original">{originalTitle}</div>
                <Input
                  placeholder={originalTitle}
                  value={translation.title ?? ''}
                  onChange={value => updateField(field.id, { title: value })}
                />

                {hasDescription && (
                  <>
                    <div className="translation-field-original">{originalDescription}</div>
                    <Input.Textarea
                      placeholder={originalDescription}
                      value={translation.description ?? ''}
                      onChange={value => updateField(field.id, { description: String(value ?? '') })}
                    />
                  </>
                )}

                {showChoices && (
                  <div className="translation-field-choices">
                    {choices!.map(choice => (
                      <div key={choice.id} className="translation-field-choice">
                        <div className="translation-field-original">{choice.label}</div>
                        <Input
                          placeholder={choice.label}
                          value={translation.choices?.[choice.id] ?? ''}
                          onChange={value => updateChoice(field.id, choice.id, value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="sticky bottom-6 z-10 flex justify-end">
          <Button
            type="primary"
            loading={saving}
            disabled={helper.isEmpty(edits)}
            onClick={handleSave}
          >
            {t('formSettings.Update')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default observer(Translations)
