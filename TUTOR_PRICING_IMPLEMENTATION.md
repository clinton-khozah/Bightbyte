# Tutor Pricing Implementation

## Overview
This implementation fetches tutor pricing from the database based on level, category, subject, and sub_level. All prices are stored in USD and automatically converted to local currency when displayed on tutor cards.

## Database Table

### Table Name: `tutor_pricing`

**Columns:**
- `id` (BIGSERIAL PRIMARY KEY)
- `level` (VARCHAR) - Primary, Secondary, University, Professional
- `category` (VARCHAR) - Languages, STEM, Humanities, Business, etc.
- `subject` (VARCHAR) - Mathematics, English, Physics, etc.
- `sub_level` (VARCHAR) - Grade 1-3, IGCSE, Undergraduate, etc.
- `hourly_rate_usd` (DECIMAL) - Price in USD
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Setup
Run the SQL file to create the table and insert pricing data:
```sql
-- Run this in Supabase SQL Editor
edu-spaceAI-API/CREATE_TUTOR_PRICING_TABLE.sql
```

## Files Created/Modified

### 1. `website/lib/tutor-pricing.ts` (NEW)
Utility functions for fetching and matching tutor pricing:
- `fetchTutorPricing()` - Fetches all pricing data from database
- `findMatchingPricing()` - Matches tutor to pricing based on subject, level, category, sub_level
- `getTutorPricing()` - Gets pricing for a tutor with currency conversion
- `getBatchTutorPricing()` - Batch fetch pricing for multiple tutors

### 2. `website/components/tutor-cards.tsx` (MODIFIED)
Updated to use database pricing instead of dynamic pricing calculation:
- Imports `getTutorPricing` from `tutor-pricing.ts`
- Replaces dynamic pricing calculation with database pricing lookup
- Automatically converts USD prices to local currency based on tutor's country
- Removed dynamic pricing updates (database pricing is static)

### 3. `edu-spaceAI-API/CREATE_TUTOR_PRICING_TABLE.sql` (NEW)
SQL script to create the pricing table with all 162 pricing entries.

## How It Works

### Pricing Matching Logic
The system matches tutors to pricing using a cascading approach:

1. **Exact Match**: subject + level + category + sub_level
2. **Partial Match 1**: subject + level + category (without sub_level)
3. **Partial Match 2**: subject + level (without category and sub_level)
4. **Subject Match**: subject only (any level)
5. **Partial Subject Match**: partial subject name match
6. **Default**: $10 USD/hour if no match found

### Currency Conversion
- All prices are stored in USD in the database
- When displaying on tutor cards, prices are automatically converted to local currency based on the tutor's country
- Uses `currency-exchange.ts` utility for conversion rates
- Supports multiple currencies: USD, ZAR, GBP, EUR, NGN, KES, GHS, EGP, INR, BRL, MXN, etc.

## Usage Example

```typescript
import { getTutorPricing } from '@/lib/tutor-pricing';

// Get pricing for a tutor
const pricing = await getTutorPricing(
  'Mathematics',           // subject
  'South Africa',          // country (for currency conversion)
  'Secondary',             // level (optional)
  'STEM',                  // category (optional)
  'IGCSE / Grade 10-11'   // sub_level (optional)
);

// pricing.hourlyRateUSD = 22.00
// pricing.hourlyRateLocal = 396.00 (22 * 18 ZAR rate)
// pricing.currencySymbol = "R"
```

## Integration Points

### Tutor Cards Component
The `TutorCards` component automatically:
1. Fetches tutors from API/Supabase
2. For each tutor, looks up pricing from database based on:
   - Primary subject (from specialization)
   - Level (from mentor.level or mentor.education_level)
   - Category (from mentor.category)
   - Sub-level (from mentor.sub_level or mentor.grade_level)
3. Converts USD price to local currency based on tutor's country
4. Displays price on tutor card

### Mentor Data Fields Used
- `specialization` - Used to determine primary subject
- `level` or `education_level` - Used for level matching
- `category` - Used for category matching
- `sub_level` or `grade_level` - Used for sub-level matching
- `country` - Used for currency conversion

## Notes

1. **Database Table Name**: The code expects a table named `tutor_pricing` in Supabase. Make sure this table exists before running the application.

2. **Matching Flexibility**: The matching algorithm is flexible and will find the best match even if not all fields are provided.

3. **Default Pricing**: If no match is found, the system defaults to $10 USD/hour.

4. **Currency Rates**: Currency exchange rates are defined in `currency-exchange.ts` and should be updated periodically for accuracy.

5. **Performance**: Pricing data is fetched once per tutor when loading the tutor list. Consider caching if performance becomes an issue.

## Testing

To test the implementation:
1. Ensure the `tutor_pricing` table exists in Supabase
2. Verify pricing data is inserted correctly
3. Check that tutors are matched to correct pricing
4. Verify currency conversion is working correctly
5. Test with tutors from different countries to ensure currency conversion

## Future Enhancements

- Add caching for pricing data to reduce database queries
- Add admin interface to update pricing
- Add pricing history/audit trail
- Support for dynamic pricing based on demand (if needed)
- Add API endpoint for pricing lookup

