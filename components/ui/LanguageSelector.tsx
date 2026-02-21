'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { Languages } from 'lucide-react'

export function LanguageSelector() {
  const { language, setLanguage, availableLanguages, t } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-gray-500" />
      <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{lang.nativeName}</span>
                <span className="text-xs text-gray-500">({lang.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
