# Hugging Face Models for Pricing Assistant

## API Method

The system uses **Hugging Face's OpenAI-compatible router endpoint** (`https://router.huggingface.co/v1`), which is more reliable and easier to use than the standard inference API.

## Recommended Free Models

Here are the best free models you can use with the Hugging Face router API for the pricing assistant:

### 1. **meta-llama/Llama-3.1-8B-Instruct:novita** ⭐ RECOMMENDED
- **Speed**: Fast
- **Quality**: Excellent
- **Best for**: General analysis and recommendations
- **Context**: 128K tokens
- **Why**: Best balance of speed, quality, and reliability (uses Novita for faster inference)

### 2. **meta-llama/Llama-3.2-3B-Instruct**
- **Speed**: Fast
- **Quality**: Excellent
- **Best for**: General analysis and recommendations
- **Context**: 128K tokens
- **Why**: Good balance of speed, quality, and reliability

### 3. **microsoft/Phi-3-mini-4k-instruct**
- **Speed**: Very Fast
- **Quality**: Good
- **Best for**: Quick analysis and structured responses
- **Context**: 4K tokens
- **Why**: Extremely fast, great for real-time recommendations

### 4. **Qwen/Qwen2.5-3B-Instruct**
- **Speed**: Fast
- **Quality**: Very Good
- **Best for**: Structured analysis and JSON responses
- **Context**: 32K tokens
- **Why**: Good at following instructions and structured output

### 5. **google/gemma-2-2b-it**
- **Speed**: Very Fast
- **Quality**: Good
- **Best for**: Lightweight applications
- **Context**: 8K tokens
- **Why**: Smallest model, fastest responses

### 6. **mistralai/Mistral-7B-Instruct-v0.2**
- **Speed**: Medium
- **Quality**: Excellent
- **Best for**: Complex analysis
- **Context**: 8K tokens
- **Why**: Higher quality but slower (may have loading delays)

## How to Use

### Option 1: Use Default (Recommended)
The system automatically tries models in order of preference. Just add your API key:

```env
# Either of these will work:
NEXT_PUBLIC_HUGGINGFACE_API_KEY=your_key_here
# OR
HF_TOKEN=your_key_here
```

The system uses the OpenAI SDK with Hugging Face's router endpoint, which is more reliable than the standard inference API.

### Option 2: Specify a Model
You can modify `website/components/pricing/ai-pricing-assistant.tsx` to use a specific model:

```typescript
const models = [
  "meta-llama/Llama-3.1-8B-Instruct:novita", // Change this to your preferred model
]
```

## Getting a Free API Key

1. Go to https://huggingface.co/
2. Sign up for a free account
3. Navigate to Settings → Access Tokens
4. Click "New token"
5. Name it (e.g., "pricing-assistant")
6. Select "Read" permission
7. Copy the token
8. Add to `.env.local`:
   ```
   NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_token_here
   ```

## Free Tier Limits

- **Rate Limits**: ~30 requests/minute (varies by model)
- **Cost**: Free for inference API
- **Availability**: Models may be "cold" and need to load (first request takes longer)

## Model Comparison

| Model | Speed | Quality | Reliability | Best Use Case |
|-------|-------|---------|-------------|---------------|
| Llama-3.2-3B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | General recommendations |
| Phi-3-mini | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Quick analysis |
| Qwen2.5-3B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Structured responses |
| Gemma-2-2B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Fast responses |
| Mistral-7B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Complex analysis |

## Troubleshooting

### Model Loading (503 Error)
- **Problem**: Model is "cold" and needs to load
- **Solution**: Wait 10-30 seconds and try again, or use a different model

### Rate Limiting
- **Problem**: Too many requests
- **Solution**: The system automatically falls back to local analysis

### No API Key
- **Problem**: No Hugging Face API key set
- **Solution**: System uses local analysis (still works, just less AI-powered)

## Current Implementation

The system uses the **OpenAI SDK** with Hugging Face's router endpoint and tries models in this order:
1. Llama-3.1-8B-Instruct:novita (best quality and speed)
2. Llama-3.2-3B-Instruct (best balance)
3. Phi-3-mini (fastest)
4. Qwen2.5-3B (good for analysis)

If all fail, it falls back to local analysis (which still provides good recommendations).

## Code Example

The implementation uses the OpenAI SDK:

```typescript
import { OpenAI } from "openai"

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.HF_TOKEN,
})

const chatCompletion = await client.chat.completions.create({
  model: "meta-llama/Llama-3.1-8B-Instruct:novita",
  messages: [
    { role: "system", content: "You are an expert pricing analyst..." },
    { role: "user", content: "Analyze this pricing scenario..." },
  ],
})
```

