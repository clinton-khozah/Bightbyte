// Currency exchange rates (USD to local currency)
// Rates are approximate and should be updated regularly
// All prices in database are stored in USD

export interface CurrencyInfo {
  code: string
  symbol: string
  rate: number // Exchange rate from USD (1 USD = rate)
}

export const currencyExchangeRates: { [country: string]: CurrencyInfo } = {
  'United States': { code: 'USD', symbol: '$', rate: 1.0 },
  'South Africa': { code: 'ZAR', symbol: 'R', rate: 18.0 }, // $1 = R18
  'United Kingdom': { code: 'GBP', symbol: '£', rate: 0.79 },
  'Canada': { code: 'CAD', symbol: 'C$', rate: 1.35 },
  'Australia': { code: 'AUD', symbol: 'A$', rate: 1.52 },
  'Germany': { code: 'EUR', symbol: '€', rate: 0.92 },
  'France': { code: 'EUR', symbol: '€', rate: 0.92 },
  'Spain': { code: 'EUR', symbol: '€', rate: 0.92 },
  'Italy': { code: 'EUR', symbol: '€', rate: 0.92 },
  'Nigeria': { code: 'NGN', symbol: '₦', rate: 1500.0 },
  'Kenya': { code: 'KES', symbol: 'KSh', rate: 130.0 },
  'Ghana': { code: 'GHS', symbol: 'GH₵', rate: 12.0 },
  'Egypt': { code: 'EGP', symbol: 'E£', rate: 30.0 },
  'India': { code: 'INR', symbol: '₹', rate: 83.0 },
  'Brazil': { code: 'BRL', symbol: 'R$', rate: 5.0 },
  'Mexico': { code: 'MXN', symbol: '$', rate: 17.0 },
}

/**
 * Get currency info for a country
 * Defaults to USD if country not found
 */
export function getCurrencyForCountry(country: string): CurrencyInfo {
  return currencyExchangeRates[country] || currencyExchangeRates['United States']
}

/**
 * Convert USD price to local currency
 * All prices in database are stored in USD
 */
export function convertUSDToLocal(usdPrice: number, country: string): number {
  const currencyInfo = getCurrencyForCountry(country)
  return usdPrice * currencyInfo.rate
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, country: string): string {
  const currencyInfo = getCurrencyForCountry(country)
  return `${currencyInfo.symbol}${price.toFixed(2)}`
}

/**
 * Get currency symbol for a country
 */
export function getCurrencySymbol(country: string): string {
  const currencyInfo = getCurrencyForCountry(country)
  return currencyInfo.symbol
}

