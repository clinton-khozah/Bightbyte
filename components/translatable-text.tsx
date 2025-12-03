"use client"

import { useEffect, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

interface TranslatableTextProps {
  children: string
  className?: string
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div'
}

export function TranslatableText({ children, className, as = 'span' }: TranslatableTextProps) {
  const { language, translate } = useTranslation()
  const [translatedText, setTranslatedText] = useState(children)

  useEffect(() => {
    if (language !== 'en' && children) {
      translate(children).then(setTranslatedText)
    } else {
      setTranslatedText(children)
    }
  }, [language, children, translate])

  const Component = as

  return <Component className={className}>{translatedText}</Component>
}

