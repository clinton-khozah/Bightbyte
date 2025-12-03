"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { translateText } from '@/lib/translation'

// Top 15 most spoken languages in the world
export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
]

interface TranslationContextType {
  language: string
  setLanguage: (lang: string) => void
  translate: (text: string) => Promise<string>
  isTranslating: boolean
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en')
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load saved language preference
      const savedLanguage = localStorage.getItem('brightbyt-language')
      if (savedLanguage && languages.find(l => l.code === savedLanguage)) {
        setLanguageState(savedLanguage)
      } else {
        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0]
        const matchedLang = languages.find(l => l.code === browserLang)
        if (matchedLang) {
          setLanguageState(browserLang)
        }
      }
    }
  }, [])

  const translate = useCallback(async (text: string): Promise<string> => {
    if (language === 'en' || !text || text.trim().length === 0) {
      return text
    }
    
    try {
      setIsTranslating(true)
      const translated = await translateText(text, language)
      return translated
    } catch (error) {
      console.error('Translation error:', error)
      return text
    } finally {
      setIsTranslating(false)
    }
  }, [language])

  const setLanguage = (lang: string) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('brightbyt-language', lang)
    }
  }

  return (
    <TranslationContext.Provider value={{ language, setLanguage, translate, isTranslating }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}

