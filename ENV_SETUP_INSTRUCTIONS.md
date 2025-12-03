# Environment Variables Setup

## How to Add Your Hugging Face API Key

### Step 1: Create `.env.local` File

In the `website` folder, create a new file called `.env.local`

**On Windows (PowerShell):**
```powershell
cd website
New-Item -Path .env.local -ItemType File
```

**Or manually:**
- Right-click in the `website` folder
- New → Text Document
- Name it `.env.local` (make sure it starts with a dot)

### Step 2: Add Your API Key

Open `.env.local` and add this line:

```env
NEXT_PUBLIC_HUGGINGFACE_API_KEY=your_token_here
```

**OR** you can use:

```env
HF_TOKEN=your_token_here
```

Both work the same way.

### Step 3: Get Your Hugging Face Token

1. Go to https://huggingface.co/
2. Sign up for a free account (if you don't have one)
3. Click your profile icon → **Settings**
4. Go to **Access Tokens** (left sidebar)
5. Click **New token**
6. Name it: `pricing-assistant` (or any name)
7. Select **Read** permission
8. Click **Generate token**
9. **Copy the token** (it starts with `hf_`)

### Step 4: Paste Your Token

Replace `your_token_here` in `.env.local` with your actual token:

```env
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_actual_token_here
```

### Step 5: Restart Your Dev Server

After creating/updating `.env.local`, restart Next.js:

```bash
# Stop the server (Ctrl+C)
# Then start again:
npm run dev
```

## Example `.env.local` File

```env
# Hugging Face API Key for AI Pricing Assistant
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Important Notes

- ✅ `.env.local` is already in `.gitignore` (safe, won't be committed)
- ✅ The system works **without** the API key (uses local analysis)
- ✅ With the API key, you get better AI-powered recommendations
- ✅ Never share your API key publicly

## Troubleshooting

**"I can't see the file"**
- Make sure "Show hidden files" is enabled in Windows Explorer
- Or use PowerShell/Command Prompt to create it

**"Token not working"**
- Make sure there are no spaces around the `=` sign
- Make sure the token starts with `hf_`
- Make sure you copied the entire token
- Restart your dev server after adding the token

**"Still using local analysis"**
- Check that the file is named exactly `.env.local` (not `.env.local.txt`)
- Check that the variable name is correct
- Make sure you restarted the dev server

