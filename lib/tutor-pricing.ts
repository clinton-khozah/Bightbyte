// Tutor Pricing Utility
// Fetches pricing from database based on level, category, subject, and sub_level
// All prices are stored in USD and converted to local currency

import { supabase } from './supabase';
import { convertUSDToLocal, getCurrencyForCountry } from './currency-exchange';

export interface TutorPricing {
  id: number;
  level: string;
  category: string;
  subject: string;
  sub_level: string;
  hourly_rate_usd: number;
}

export interface PricingMatch {
  pricing: TutorPricing | null;
  hourlyRateUSD: number;
  hourlyRateLocal: number;
  currencySymbol: string;
}

// Cache pricing data to avoid repeated database calls
let pricingCache: TutorPricing[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all pricing data from database
 */
export async function fetchTutorPricing(): Promise<TutorPricing[]> {
  try {
    // Return cached data if still valid
    const now = Date.now();
    if (pricingCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log(`Using cached pricing data (${pricingCache.length} entries)`);
      return pricingCache;
    }

    console.log('Fetching tutor pricing from database...');
    const { data, error } = await supabase
      .from('tutor_pricing')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching tutor pricing:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // If table doesn't exist, suggest creating it
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('ERROR: tutor_pricing table does not exist! Please run CREATE_TUTOR_PRICING_TABLE.sql in Supabase.');
      }
      
      return [];
    }

    const pricingData = data || [];
    console.log(`Successfully fetched ${pricingData.length} pricing entries from database`);
    
    // Cache the data
    pricingCache = pricingData;
    cacheTimestamp = now;
    
    // Log sample of pricing data for debugging
    if (pricingData.length > 0) {
      console.log('Sample pricing entries:', pricingData.slice(0, 5).map(p => ({
        id: p.id,
        level: p.level,
        category: p.category,
        subject: p.subject,
        sub_level: p.sub_level,
        hourly_rate_usd: p.hourly_rate_usd,
      })));
    }

    return pricingData;
  } catch (error) {
    console.error('Error fetching tutor pricing:', error);
    return [];
  }
}

/**
 * Normalize subject names for better matching
 */
function normalizeSubjectName(subject: string): string {
  let normalized = subject.toLowerCase().trim();
  
  // Remove common prefixes/suffixes
  normalized = normalized
    .replace(/^subject:\s*/i, '')
    .replace(/\s*\(.*?\)/g, '') // Remove parentheses content
    .replace(/\s+/g, ' ')
    .trim();
  
  // Common subject name mappings
  const mappings: { [key: string]: string } = {
    'math': 'mathematics',
    'maths': 'mathematics',
    'mathematics': 'mathematics',
    'english': 'english language',
    'eng': 'english language',
    'english language': 'english language',
    'science': 'natural science',
    'natural science': 'natural science',
    'physical science': 'natural science',
    'physics': 'physics',
    'chemistry': 'chemistry',
    'biology': 'biology / life sciences',
    'life science': 'biology / life sciences',
    'life sciences': 'biology / life sciences',
    'computer science': 'computer science',
    'cs': 'computer science',
    'ict': 'ict',
    'ict basics': 'ict basics',
    'programming': 'programming (python, java, javascript, c#)',
    'python': 'programming (python, java, javascript, c#)',
    'java': 'programming (python, java, javascript, c#)',
    'javascript': 'programming (python, java, javascript, c#)',
    'web development': 'web development (frontend & backend)',
    'web dev': 'web development (frontend & backend)',
    'ai': 'artificial intelligence & machine learning',
    'artificial intelligence': 'artificial intelligence & machine learning',
    'machine learning': 'artificial intelligence & machine learning',
    'ml': 'artificial intelligence & machine learning',
    'data science': 'data science (python, pandas, bi)',
    'geography': 'geography',
    'history': 'history',
    'economics': 'economics',
    'accounting': 'accounting',
    'business': 'business studies',
    'business studies': 'business studies',
    'social studies': 'social studies',
    'civics': 'civics / social studies',
    'creative arts': 'creative arts',
    'art': 'art & design',
    'art & design': 'art & design',
    'music': 'music',
    'drama': 'drama / theatre studies',
    'theatre': 'drama / theatre studies',
    'reading': 'reading & literacy',
    'literacy': 'reading & literacy',
    'reading & literacy': 'reading & literacy',
  };
  
  // Check for exact mapping first
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return normalized;
}

/**
 * Find matching pricing for a tutor based on their subject, level, category, and sub_level
 * Returns the best match or default pricing
 */
export function findMatchingPricing(
  pricingData: TutorPricing[],
  tutorSubject: string,
  tutorLevel?: string,
  tutorCategory?: string,
  tutorSubLevel?: string
): TutorPricing | null {
  if (!pricingData || pricingData.length === 0) {
    console.warn('No pricing data available');
    return null;
  }

  // Normalize inputs for matching
  const normalizeSubject = (subject: string): string => {
    return normalizeSubjectName(subject);
  };

  const normalizeLevel = (level: string): string => {
    return level.toLowerCase().trim();
  };

  const normalizeCategory = (category: string): string => {
    return category.toLowerCase().trim();
  };

  const normalizeSubLevel = (subLevel: string): string => {
    return subLevel.toLowerCase().trim();
  };

  const normalizedSubject = normalizeSubject(tutorSubject);
  const normalizedLevel = tutorLevel ? normalizeLevel(tutorLevel) : '';
  const normalizedCategory = tutorCategory ? normalizeCategory(tutorCategory) : '';
  const normalizedSubLevel = tutorSubLevel ? normalizeSubLevel(tutorSubLevel) : '';

  console.log('Matching pricing for:', {
    tutorSubject,
    normalizedSubject,
    tutorLevel,
    normalizedLevel,
    tutorCategory,
    normalizedCategory,
    tutorSubLevel,
    normalizedSubLevel,
  });

  // Try exact match first (subject + level + category + sub_level)
  if (normalizedLevel && normalizedCategory && normalizedSubLevel) {
    const exactMatch = pricingData.find(
      (p) =>
        normalizeSubject(p.subject) === normalizedSubject &&
        normalizeLevel(p.level) === normalizedLevel &&
        normalizeCategory(p.category) === normalizedCategory &&
        normalizeSubLevel(p.sub_level) === normalizedSubLevel
    );
    if (exactMatch) {
      console.log('Found exact match:', exactMatch);
      return exactMatch;
    }
  }

  // Try match with subject + level + category (without sub_level)
  if (normalizedLevel && normalizedCategory) {
    const match = pricingData.find(
      (p) =>
        normalizeSubject(p.subject) === normalizedSubject &&
        normalizeLevel(p.level) === normalizedLevel &&
        normalizeCategory(p.category) === normalizedCategory
    );
    if (match) {
      console.log('Found match (subject + level + category):', match);
      return match;
    }
  }

  // Try match with subject + level (without category and sub_level)
  if (normalizedLevel) {
    const match = pricingData.find(
      (p) =>
        normalizeSubject(p.subject) === normalizedSubject &&
        normalizeLevel(p.level) === normalizedLevel
    );
    if (match) {
      console.log('Found match (subject + level):', match);
      return match;
    }
  }

  // Try match with subject only (any level) - prioritize common levels
  const subjectMatches = pricingData.filter(
    (p) => normalizeSubject(p.subject) === normalizedSubject
  );
  
  if (subjectMatches.length > 0) {
    // Prioritize Secondary, then University, then Primary, then Professional
    const priorityOrder = ['secondary', 'university', 'primary', 'professional'];
    for (const level of priorityOrder) {
      const match = subjectMatches.find((p) => normalizeLevel(p.level) === level);
      if (match) {
        console.log('Found subject match (prioritized by level):', match);
        return match;
      }
    }
    // If no priority match, return first match
    console.log('Found subject match (first):', subjectMatches[0]);
    return subjectMatches[0];
  }

  // Try partial subject match (e.g., "Mathematics" matches "Math")
  const partialMatches = pricingData.filter((p) => {
    const pSubject = normalizeSubject(p.subject);
    return (
      pSubject.includes(normalizedSubject) ||
      normalizedSubject.includes(pSubject) ||
      pSubject.split(' ').some(word => normalizedSubject.includes(word)) ||
      normalizedSubject.split(' ').some(word => pSubject.includes(word))
    );
  });
  
  if (partialMatches.length > 0) {
    // Prioritize by level
    const priorityOrder = ['secondary', 'university', 'primary', 'professional'];
    for (const level of priorityOrder) {
      const match = partialMatches.find((p) => normalizeLevel(p.level) === level);
      if (match) {
        console.log('Found partial subject match (prioritized):', match);
        return match;
      }
    }
    console.log('Found partial subject match (first):', partialMatches[0]);
    return partialMatches[0];
  }

  console.warn('No pricing match found for subject:', tutorSubject);
  return null;
}

/**
 * Get pricing for a tutor with currency conversion
 */
export async function getTutorPricing(
  tutorSubject: string,
  tutorCountry: string = 'United States',
  tutorLevel?: string,
  tutorCategory?: string,
  tutorSubLevel?: string
): Promise<PricingMatch> {
  try {
    // Fetch all pricing data
    const pricingData = await fetchTutorPricing();
    
    console.log(`Fetched ${pricingData.length} pricing entries from database`);

    if (pricingData.length === 0) {
      console.error('No pricing data found in database!');
    }

    // Find matching pricing
    const matchedPricing = findMatchingPricing(
      pricingData,
      tutorSubject,
      tutorLevel,
      tutorCategory,
      tutorSubLevel
    );

    // Get hourly rate in USD (default to $10 if no match)
    const hourlyRateUSD = matchedPricing
      ? parseFloat(matchedPricing.hourly_rate_usd.toString())
      : 10.0;

    if (!matchedPricing) {
      console.warn(`No pricing match found for "${tutorSubject}". Using default $10 USD.`);
    } else {
      console.log(`Matched pricing for "${tutorSubject}": $${hourlyRateUSD} USD`);
    }

    // Convert to local currency
    const currencyInfo = getCurrencyForCountry(tutorCountry);
    const hourlyRateLocal = convertUSDToLocal(hourlyRateUSD, tutorCountry);

    return {
      pricing: matchedPricing,
      hourlyRateUSD,
      hourlyRateLocal,
      currencySymbol: currencyInfo.symbol,
    };
  } catch (error) {
    console.error('Error getting tutor pricing:', error);
    // Return default pricing
    const currencyInfo = getCurrencyForCountry(tutorCountry);
    return {
      pricing: null,
      hourlyRateUSD: 10.0,
      hourlyRateLocal: convertUSDToLocal(10.0, tutorCountry),
      currencySymbol: currencyInfo.symbol,
    };
  }
}

/**
 * Batch get pricing for multiple tutors
 */
export async function getBatchTutorPricing(
  tutors: Array<{
    subject: string;
    country?: string;
    level?: string;
    category?: string;
    subLevel?: string;
  }>
): Promise<Map<string, PricingMatch>> {
  const pricingMap = new Map<string, PricingMatch>();
  const pricingData = await fetchTutorPricing();

  for (const tutor of tutors) {
    const key = `${tutor.subject}-${tutor.level || ''}-${tutor.category || ''}-${tutor.subLevel || ''}`;
    const matchedPricing = findMatchingPricing(
      pricingData,
      tutor.subject,
      tutor.level,
      tutor.category,
      tutor.subLevel
    );

    const hourlyRateUSD = matchedPricing
      ? parseFloat(matchedPricing.hourly_rate_usd.toString())
      : 10.0;

    const country = tutor.country || 'United States';
    const currencyInfo = getCurrencyForCountry(country);
    const hourlyRateLocal = convertUSDToLocal(hourlyRateUSD, country);

    pricingMap.set(key, {
      pricing: matchedPricing,
      hourlyRateUSD,
      hourlyRateLocal,
      currencySymbol: currencyInfo.symbol,
    });
  }

  return pricingMap;
}

