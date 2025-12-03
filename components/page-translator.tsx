"use client"

import { useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

export function PageTranslator() {
  const { language, translate } = useTranslation()

  useEffect(() => {
    if (language === 'en') {
      // Reset all translated elements to original text
      const translatedElements = document.querySelectorAll('[data-translated="true"]')
      translatedElements.forEach((el) => {
        const originalText = el.getAttribute('data-original-text')
        if (originalText) {
          el.textContent = originalText
          el.removeAttribute('data-translated')
          el.removeAttribute('data-original-text')
        }
      })
      return
    }

    const translatePageContent = async () => {
      // Get all text elements that should be translated
      const selectors = 'p:not([data-no-translate]), h1:not([data-no-translate]), h2:not([data-no-translate]), h3:not([data-no-translate]), h4:not([data-no-translate]), h5:not([data-no-translate]), h6:not([data-no-translate]), span:not([data-no-translate]):not([class*="icon"]), a:not([data-no-translate]), button:not([data-no-translate]), label:not([data-no-translate]), li:not([data-no-translate])'
      
      const elements = document.querySelectorAll(selectors)
      
      // Filter elements that need translation
      const elementsToTranslate = Array.from(elements).filter((el) => {
        // Skip if already translated
        if (el.getAttribute('data-translated') === 'true') return false
        // Skip if has no-translate attribute
        if (el.hasAttribute('data-no-translate')) return false
        // Skip if empty
        const text = el.textContent?.trim()
        if (!text) return false
        // Skip if too long (likely dynamic content)
        if (text.length > 500) return false
        // Skip if contains only numbers or special characters
        if (!/[a-zA-Z]/.test(text)) return false
        // Skip if it's a child of an already translated element
        if (el.closest('[data-translated="true"]')) return false
        return true
      })

      // Translate each element in batches to avoid overwhelming the API
      const batchSize = 10
      for (let i = 0; i < elementsToTranslate.length; i += batchSize) {
        const batch = elementsToTranslate.slice(i, i + batchSize)
        
        const translationPromises = batch.map(async (element) => {
          // Check if element is still in the DOM
          if (!document.body.contains(element)) return
          
          const originalText = element.textContent?.trim()
          if (!originalText) return

          try {
            const translated = await translate(originalText)
            if (translated !== originalText && translated) {
              // Double-check element is still in DOM before updating
              if (document.body.contains(element)) {
                // Store original text
                element.setAttribute('data-original-text', originalText)
                element.textContent = translated
                element.setAttribute('data-translated', 'true')
              }
            }
          } catch (error) {
            console.error('Error translating element:', error)
          }
        })

        await Promise.all(translationPromises)
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < elementsToTranslate.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    // Delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      translatePageContent()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [language, translate])

  return null
}

