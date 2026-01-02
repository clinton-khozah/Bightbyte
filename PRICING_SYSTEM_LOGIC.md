# GPT-Powered Pricing System - Logic Overview

## 🎯 Goal
Create the **best pricing model in the world** that:
- Uses GPT-4o to analyze market conditions every hour
- Tracks inflection points (demand spikes)
- Monitors mentor slot prioritization
- Adjusts prices based on subject demand (Math > History)
- Learns from booking patterns

## 🏗️ Architecture

### 1. Database Layer

#### `subject_demand` Table
- **Purpose**: Track demand levels for each subject
- **Key Fields**:
  - `demand_level`: low/medium/high/critical
  - `base_multiplier`: Price multiplier (0.8-1.5)
  - `current_demand_score`: 0-100 demand score
  - `booking_requests_24h`: Requests in last 24h
  - `available_mentors`: Number of mentors teaching this
  - `supply_demand_ratio`: available_mentors / booking_requests
  - `trend_direction`: rising/falling/stable

**Example**:
- Mathematics: `demand_level='high'`, `base_multiplier=1.4`, `demand_score=85`
- History: `demand_level='low'`, `base_multiplier=1.0`, `demand_score=40`

#### `pricing_analytics` Table
- **Purpose**: Store hourly GPT market analysis
- **Key Fields**:
  - `analysis_timestamp`: When analysis ran
  - `market_conditions`: Full GPT JSON response
  - `average_price_usd`: Market average price
  - `price_trend`: rising/falling/stable
  - `peak_hours`: [14, 15, 16, 19, 20] (hours with high demand)
  - `subject_insights`: GPT analysis per subject
  - `inflection_points`: Detected demand spikes
  - `mentor_slot_priorities`: Which slots are prioritized
  - `gpt_analysis_text`: Full text summary
  - `recommendations`: Actionable recommendations

#### `booking_patterns` Table
- **Purpose**: Track all booking requests to identify patterns
- **Key Fields**:
  - `mentor_id`: Which mentor
  - `subject`: What subject
  - `requested_time`: When requested
  - `price_offered`: What student offered
  - `price_accepted`: What was accepted
  - `status`: pending/accepted/rejected/cancelled

**Use Cases**:
- Calculate acceptance rates by subject
- Identify price points that work
- Track demand by time of day

#### `market_inflection_points` Table
- **Purpose**: Store detected demand spikes
- **Key Fields**:
  - `detected_at`: When spike detected
  - `subject`: Which subject
  - `time_of_day`: Hour (0-23)
  - `demand_spike_percentage`: % increase in demand
  - `price_impact_percentage`: Recommended price increase
  - `gpt_analysis`: GPT explanation

**Example**:
- Mathematics at 2 PM on Tuesday: 150% demand spike → +25% price increase

#### `mentor_pricing_history` Table
- **Purpose**: Track price changes over time
- **Key Fields**:
  - `mentor_id`: Which mentor
  - `base_hourly_rate`: Base rate
  - `dynamic_price`: Calculated dynamic price
  - `gpt_recommendation`: GPT's recommended price
  - `pricing_factors`: All factors used
  - `market_conditions_at_time`: Market snapshot

### 2. Backend Service Layer

#### `GPTPricingAnalyzer` Class

**Main Method: `analyze_market_conditions()`**

Runs every hour and:

1. **Gathers Market Data**:
   ```python
   - Last 24h booking patterns
   - All mentor statistics
   - Subject demand data
   - Historical pricing trends (last 7 days)
   ```

2. **Calculates Statistics**:
   ```python
   - Booking requests by subject
   - Acceptance rates
   - Average prices offered/accepted
   - Peak hours and days
   - Supply/demand ratios
   ```

3. **Sends to GPT-4o**:
   ```python
   Prompt includes:
   - All market data
   - Historical trends
   - Current conditions
   
   GPT analyzes:
   - Market trends
   - Inflection points
   - Subject demand patterns
   - Peak hours
   - Optimal pricing multipliers
   ```

4. **Processes GPT Response**:
   ```python
   - Extracts structured JSON
   - Updates subject demand levels
   - Detects inflection points
   - Saves analysis to database
   ```

5. **Updates Subject Demand**:
   ```python
   - Updates demand_level based on GPT
   - Adjusts base_multiplier
   - Calculates demand_score
   - Sets trend_direction
   ```

#### `calculate_optimal_price()` Method

When a user requests pricing:

1. **Fetches Latest Analysis**:
   - Gets most recent `pricing_analytics`
   - Gets `subject_demand` for the subject
   - Gets mentor data

2. **Applies Multipliers**:
   ```python
   base_price = mentor.hourly_rate * (duration / 60)
   
   # Subject multiplier (from GPT analysis)
   subject_multiplier = subject_demand.base_multiplier
   
   # Time multiplier (peak hours = 1.2x)
   time_multiplier = 1.2 if peak_hour else 1.0
   
   # Urgency multiplier
   urgency_multiplier = 1.3 if urgent else 1.0
   
   # Experience multiplier
   exp_multiplier = 0.9-1.4 based on years
   
   # Rating multiplier
   rating_multiplier = 0.9-1.3 based on rating
   
   subtotal = base_price * subject_multiplier * time_multiplier * 
              urgency_multiplier * exp_multiplier * rating_multiplier
   
   platform_fee = subtotal * 0.16
   total = subtotal + platform_fee
   ```

3. **Returns Price Breakdown**:
   ```json
   {
     "base_price": 10.00,
     "subject_multiplier": 1.4,
     "time_multiplier": 1.2,
     "urgency_multiplier": 1.0,
     "experience_multiplier": 1.15,
     "rating_multiplier": 1.1,
     "subtotal": 21.25,
     "platform_fee": 3.40,
     "total": 24.65,
     "currency": "USD"
   }
   ```

### 3. Frontend Layer

#### `GPTPricingModal` Component

1. **On Open**:
   - Calls `calculateGPTPrice()` API
   - Calls `getLatestMarketAnalysis()` API
   - Shows loading state

2. **Displays**:
   - Total price (GPT-optimized)
   - Market analysis summary
   - All price factors with multipliers
   - Subject-specific GPT insights

3. **Fallback**:
   - If GPT fails, uses rule-based pricing
   - Shows warning message

## 🔄 Hourly Analysis Flow

```
Every Hour:
1. Cron job triggers → run_pricing_analysis command
2. GPTPricingAnalyzer.analyze_market_conditions()
3. Gathers last 24h data
4. Sends to GPT-4o with comprehensive prompt
5. GPT analyzes and returns JSON
6. System processes response:
   - Updates subject_demand table
   - Saves to pricing_analytics table
   - Detects inflection points
7. Next hour: Repeat
```

## 📊 GPT Analysis Prompt Structure

```
You are an expert pricing analyst for an online tutoring platform.

MARKET DATA:
{
  "booking_stats": {
    "total_requests_24h": 150,
    "by_subject": {
      "Mathematics": {
        "count": 45,
        "accepted": 38,
        "avg_price_offered": 25.50,
        "avg_price_accepted": 28.00
      }
    },
    "peak_hours": [14, 15, 16, 19, 20]
  },
  "mentor_stats": {
    "total_mentors": 50,
    "average_rating": 4.2,
    "average_hourly_rate": 20.00
  },
  "subject_data": {
    "Mathematics": {
      "demand_level": "high",
      "demand_score": 85,
      "booking_requests_24h": 45,
      "available_mentors": 12,
      "supply_demand_ratio": 0.27
    }
  }
}

ANALYSIS REQUIRED:
1. Market trends
2. Inflection points
3. Subject demand patterns
4. Peak hours
5. Optimal pricing multipliers
6. Recommendations

Return JSON with structured analysis.
```

## 🎯 Key Features

### 1. Subject Demand Prioritization
- **High Demand**: Math, Science, Programming → 1.4x multiplier
- **Medium Demand**: Business, Physics → 1.2x multiplier
- **Low Demand**: History, Art → 1.0x multiplier

### 2. Inflection Point Detection
- Detects sudden demand spikes
- Example: Math tutoring spikes 150% at 2 PM on Tuesdays
- Automatically recommends price increase

### 3. Mentor Slot Prioritization
- GPT identifies which time slots are most valuable
- Peak hours get 1.2x multiplier
- Off-peak hours get 0.9x multiplier

### 4. Real-Time Market Adaptation
- Prices adjust based on:
  - Current booking demand
  - Mentor availability
  - Time of day
  - Day of week
  - Subject popularity

### 5. Learning from Patterns
- Tracks what prices work (accepted vs rejected)
- Adjusts multipliers based on success rates
- Learns from historical data

## 💡 Example Scenarios

### Scenario 1: High Demand Subject
```
Subject: Mathematics
Demand Level: High (1.4x)
Time: 2 PM (Peak hour, 1.2x)
Mentor: 5 years exp (1.25x), 4.8 rating (1.3x)
Urgent: No (1.0x)

Calculation:
Base: $20/hour
Subject: $20 * 1.4 = $28
Time: $28 * 1.2 = $33.60
Exp: $33.60 * 1.25 = $42.00
Rating: $42.00 * 1.3 = $54.60
Platform Fee: $54.60 * 0.16 = $8.74
Total: $63.34
```

### Scenario 2: Low Demand Subject
```
Subject: History
Demand Level: Low (1.0x)
Time: 10 AM (Off-peak, 0.9x)
Mentor: 2 years exp (1.0x), 3.5 rating (0.9x)
Urgent: No (1.0x)

Calculation:
Base: $20/hour
Subject: $20 * 1.0 = $20
Time: $20 * 0.9 = $18
Exp: $18 * 1.0 = $18
Rating: $18 * 0.9 = $16.20
Platform Fee: $16.20 * 0.16 = $2.59
Total: $18.79
```

### Scenario 3: Inflection Point
```
GPT detects: Mathematics demand spike at 2 PM Tuesday
Spike: 150% increase
Recommendation: +25% price increase

System applies:
- Normal Math price: $30
- During inflection: $30 * 1.25 = $37.50
```

## 🚀 Why This is the Best Pricing Model

1. **AI-Powered**: Uses GPT-4o for intelligent analysis
2. **Real-Time**: Updates every hour
3. **Adaptive**: Learns from market conditions
4. **Subject-Aware**: Different prices for different subjects
5. **Time-Aware**: Adjusts for peak/off-peak hours
6. **Inflection Detection**: Catches demand spikes
7. **Data-Driven**: Based on actual booking patterns
8. **Transparent**: Shows all factors to users

## 📈 Expected Results

- **Higher Revenue**: Optimal pricing maximizes earnings
- **Better Matching**: Prices reflect true market value
- **Fair Pricing**: Both mentors and students benefit
- **Market Leadership**: Most advanced pricing in industry

---

**This system will make your platform the leader in intelligent pricing!** 🎯

