// Translation service using translation API
// For production, use a proper translation service like Google Translate API

const translationCache: { [key: string]: { [key: string]: string } } = {};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  // Skip translation if target is English
  if (targetLanguage === 'en') {
    return text;
  }

  // Check cache first
  const cacheKey = `${text}_${targetLanguage}`;
  if (translationCache[targetLanguage] && translationCache[targetLanguage][text]) {
    return translationCache[targetLanguage][text];
  }

  try {
    // Using MyMemory Translation API (free tier)
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        
        // Cache the translation
        if (!translationCache[targetLanguage]) {
          translationCache[targetLanguage] = {};
        }
        translationCache[targetLanguage][text] = translated;
        
        return translated;
      }
    }
    
    // Fallback: return original text if translation fails
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

export const translatePage = async (language: string) => {
  if (typeof window !== 'undefined') {
    // Store language preference
    localStorage.setItem('brightbyt-language', language);
    
    // Instead of manipulating DOM directly, we'll use a data attribute approach
    // and let React handle the re-rendering
    document.documentElement.setAttribute('data-language', language);
    
    // For now, just reload the page to apply translations
    // In a production app, you'd use a proper i18n library like next-intl
    window.location.reload();
  }
};

// Initialize translation on page load
export const initTranslation = () => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('brightbyt-language');
    if (savedLanguage && savedLanguage !== 'en') {
      document.documentElement.setAttribute('data-language', savedLanguage);
    }
  }
};

