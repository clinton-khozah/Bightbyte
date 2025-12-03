"use client"

import { useEffect, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

export function usePageTranslation() {
  const { language, translate } = useTranslation()
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    if (language === 'en') {
      // If English, no translation needed
      return
    }

    const translatePageContent = async () => {
      setIsTranslating(true)
      
      try {
        // Get all text nodes that should be translated
        const selectors = 'p, h1, h2, h3, h4, h5, h6, span, a, button, label, li, td, th, div:not([data-no-translate])'
        const elements = document.querySelectorAll(selectors)
        
        // Filter out elements that are already translated or shouldn't be translated
        const elementsToTranslate = Array.from(elements).filter((el) => {
          // Skip if already translated
          if (el.getAttribute('data-translated') === 'true') return false
          // Skip if has no-translate attribute
          if (el.hasAttribute('data-no-translate')) return false
          // Skip if empty
          if (!el.textContent?.trim()) return false
          // Skip if too long (likely dynamic content)
          if (el.textContent.length > 500) return false
          // Skip if contains only numbers or special characters
          if (!/[a-zA-Z]/.test(el.textContent)) return false
          return true
        })

        // Translate each element
        const translationPromises = elementsToTranslate.map(async (element) => {
          const originalText = element.textContent?.trim()
          if (!originalText) return

          try {
            const translated = await translate(originalText)
            if (translated !== originalText) {
              // Store original text in data attribute
              element.setAttribute('data-original-text', originalText)
              element.textContent = translated
              element.setAttribute('data-translated', 'true')
            }
          } catch (error) {
            console.error('Error translating element:', error)
          }
        })

        await Promise.all(translationPromises)
      } catch (error) {
        console.error('Error translating page:', error)
      } finally {
        setIsTranslating(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      translatePageContent()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [language, translate])

  return { isTranslating }
}

