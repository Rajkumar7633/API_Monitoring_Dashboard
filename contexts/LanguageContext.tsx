'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTranslation, Language, languages } from '@/lib/i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: any, fallback?: string) => string
  availableLanguages: typeof languages
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en')
  const { t } = useTranslation(language)

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('dashboard-language') as Language
    if (savedLanguage && languages.some(lang => lang.code === savedLanguage)) {
      setLanguageState(savedLanguage)
    }
  }, [])

  // Save language to localStorage when it changes
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem('dashboard-language', newLanguage)
    
    // Update document direction for RTL languages (if added in future)
    document.documentElement.lang = newLanguage
    document.documentElement.dir = languages.find(l => l.code === newLanguage)?.code === 'ar' ? 'rtl' : 'ltr'
  }

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    availableLanguages: languages
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// HOC for components that need translation
export function withTranslation<P extends object>(
  Component: React.ComponentType<P & { t: (key: any, fallback?: string) => string }>
) {
  return function TranslatedComponent(props: P) {
    const { t } = useLanguage()
    return <Component {...props} t={t} />
  }
}
