# Dynamic Pricing System Documentation

## Overview

The dynamic pricing system automatically calculates tutor/mentor prices based on multiple factors, similar to Uber's surge pricing or Nolt's dynamic pricing model. It includes an AI-powered pricing assistant using Hugging Face.

## Features

### 1. **Automatic Price Calculation**
- Calculates prices based on 9+ factors
- Updates in real-time as conditions change
- Displays transparent price breakdown

### 2. **Price Display on Tutor Cards**
- Shows "Starting from" price on each tutor card
- Price is calculated dynamically based on current conditions
- Includes currency conversion

### 3. **Pricing Modal**
- Detailed breakdown of all pricing factors
- Visual indicators (green for discounts, red for surcharges)
- Shows base price vs. adjusted price

### 4. **AI Pricing Assistant**
- Uses Hugging Face OpenAI-compatible API (router endpoint) for pricing recommendations
- Supports multiple free models (Llama, Phi-3, Qwen, etc.)
- Analyzes market conditions and suggests optimal pricing
- Falls back to local analysis if API is unavailable

### 5. **Database Integration**
- Updates mentor's base hourly rate in database
- Stores pricing factors for future reference
- Tracks pricing history

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the `website` directory:

```env
# Either of these will work:
NEXT_PUBLIC_HUGGINGFACE_API_KEY=your_huggingface_api_key_here
# OR
HF_TOKEN=your_huggingface_api_key_here
```

**To get a free Hugging Face API key:**
1. Go to https://huggingface.co/
2. Sign up for a free account
3. Go to Settings → Access Tokens
4. Create a new token (with "Read" permission)
5. Copy the token to your `.env.local` file

**Note:** The system works without the API key (uses local analysis), but AI recommendations will be more basic.

**API Method:** The system uses Hugging Face's OpenAI-compatible router endpoint (`https://router.huggingface.co/v1`), which is more reliable than the standard inference API. It automatically tries multiple models in order of preference.

### 2. Database Schema

Ensure your `mentors` table has these fields:
- `hourly_rate` (decimal/numeric) - Base hourly rate
- `experience` (integer) - Years of experience
- `rating` (decimal) - Average rating (0-5)
- `total_reviews` (integer) - Total number of reviews
- `sessions_conducted` (integer) - Total bookings completed
- `country` (string) - Mentor's country
- `city` (string, optional) - Mentor's city
- `pricing_factors` (JSON, optional) - Stored pricing factors
- `pricing_updated_at` (timestamp, optional) - Last pricing update

### 3. API Endpoint (Optional)

If you want to update prices via API, create an endpoint:

```
PATCH /api/v1/mentors/{mentor_id}/update-price/
Body: { "hourly_rate": 75.00 }
```

## How It Works

### Price Calculation Flow

1. **User views tutor card** → System fetches mentor data
2. **System calculates base price** → Uses mentor's hourly_rate
3. **Applies multipliers** → Based on experience, rating, demand, time, etc.
4. **Displays price** → Shows on card and in modal
5. **User clicks "View Pricing"** → Opens pricing modal with full breakdown
6. **User clicks AI button** → AI analyzes and suggests optimal price
7. **User confirms** → Price is saved to database

### Pricing Factors

| Factor | Range | Impact |
|--------|-------|--------|
| Experience | 0.8x - 1.5x | More experience = higher price |
| Rating | 0.9x - 1.3x | Higher rating = higher price |
| Subject Demand | 0.9x - 1.4x | High demand = higher price |
| Time of Day | 0.8x - 1.5x | Peak hours = higher price |
| Location | 0.9x - 1.2x | Premium locations = higher price |
| Urgency | 1.0x - 1.5x | Urgent bookings = +50% |
| Session Type | 0.9x - 1.2x | In-person costs more |
| Student Level | 0.95x - 1.15x | Advanced students pay more |
| Availability | 0.9x - 1.3x | Busy mentors cost more |

## Usage Examples

### Display Price on Card
```typescript
// Already integrated in tutor-cards.tsx
// Price is automatically calculated and displayed
```

### Open Pricing Modal
```typescript
<PricingModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  mentor={mentorData}
  sessionDetails={sessionDetails}
  onConfirm={(priceBreakdown) => {
    // Handle booking with price
  }}
/>
```

### Use AI Assistant
```typescript
<AIPricingAssistant
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  currentFactors={pricingFactors}
  currentPrice={priceBreakdown}
  onPriceUpdate={(newPrice, recommendation) => {
    // Update price in database
    await updateMentorPrice(mentorId, newPrice.total)
  }}
/>
```

## Files Created

1. **`website/lib/pricing-calculator.ts`** - Core pricing calculation logic
2. **`website/components/pricing/pricing-modal.tsx`** - Pricing breakdown modal
3. **`website/components/pricing/ai-pricing-assistant.tsx`** - AI pricing assistant
4. **`website/lib/pricing-api.ts`** - API functions for database updates
5. **`website/components/tutor-cards.tsx`** - Updated with pricing display

## Testing

1. **View Landing Page** → Check tutor cards show prices
2. **Click "View Pricing"** → See detailed breakdown
3. **Click AI Button** → Get AI recommendations
4. **Change session details** → See price update dynamically
5. **Confirm booking** → Price saved to database

## Notes

- Prices update automatically when mentor data changes
- AI assistant works offline (local analysis) if API key is not set
- All prices include 16% platform fee
- Currency is automatically detected based on location
- Prices are calculated in real-time, no caching

