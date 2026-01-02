# Netlify Environment Variables Setup

This document lists all environment variables needed for deploying your Next.js application to Netlify.

## Required Environment Variables

Add these environment variables in your Netlify dashboard under **Site settings → Environment variables**.

### 1. Supabase Configuration (Required)

```env
NEXT_PUBLIC_SUPABASE_URL=https://qvyofdffddwgpduljlit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eW9mZGZmZGR3Z3BkdWxqbGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE5ODUsImV4cCI6MjA3MjQxNzk4NX0.TEEUTy4cgKsL_g8QGdupjCkvXqueN8qFFrf4JO6QQPs
```

**Purpose:** Database and authentication backend

---

### 2. Google OAuth (Required for Google Sign-In)

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=987266730923-tc532dfe6e7ninoci6f230svs5jidbrp.apps.googleusercontent.com
```

**Purpose:** Google authentication integration

**Note:** Make sure to add your Netlify domain to authorized redirect URIs in Google Cloud Console:

- `https://your-site.netlify.app/auth/callback`
- `https://your-site.netlify.app` (for production)

---

### 3. Backend API URL (Required)

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api/v1
```

**Purpose:** Points to your Django backend API

**Options:**

- If using the same backend: `https://your-backend.netlify.app/api/v1` (if backend is also on Netlify)
- If backend is elsewhere: `https://your-backend-domain.com/api/v1`
- For local development: `http://localhost:8000/api/v1` (only for local)

**Note:** Replace `your-backend-api.com` with your actual backend URL

---

### 4. Hugging Face API Key (Optional but Recommended)

```env
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_token_here
```

**Purpose:** AI-powered pricing assistant features

**How to get:**

1. Go to https://huggingface.co/
2. Sign up/login
3. Settings → Access Tokens → New token
4. Copy the token (starts with `hf_`)

**Note:** The app works without this, but AI features will be limited.

---

## Optional Environment Variables

### Alternative API Base URL (if different from NEXT_PUBLIC_API_URL)

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.com/api/v1
```

**Purpose:** Used in some components as an alternative API URL

---

## How to Add Environment Variables in Netlify

### Method 1: Via Netlify Dashboard

1. Go to your site dashboard on Netlify
2. Click **Site settings** (gear icon)
3. Click **Environment variables** in the left sidebar
4. Click **Add a variable**
5. Enter the variable name and value
6. Select the scope (Production, Deploy previews, Branch deploys, or All)
7. Click **Save**

### Method 2: Via netlify.toml

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "cd website && npm run build"
  publish = "website/.next"

[build.environment]
  NEXT_PUBLIC_SUPABASE_URL = "https://qvyofdffddwgpduljlit.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-key-here"
  NEXT_PUBLIC_GOOGLE_CLIENT_ID = "your-client-id-here"
  NEXT_PUBLIC_API_URL = "https://your-backend-api.com/api/v1"
  NEXT_PUBLIC_HUGGINGFACE_API_KEY = "your-token-here"
```

**⚠️ Warning:** Don't commit sensitive keys to git! Use Netlify dashboard for sensitive values.

---

## Environment Variables Summary Table

| Variable Name                     | Required    | Purpose                | Default Value                  |
| --------------------------------- | ----------- | ---------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`        | ✅ Yes      | Supabase database URL  | Hardcoded fallback exists      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | ✅ Yes      | Supabase anonymous key | Hardcoded fallback exists      |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | ✅ Yes      | Google OAuth client ID | Hardcoded fallback exists      |
| `NEXT_PUBLIC_API_URL`             | ✅ Yes      | Backend API endpoint   | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_HUGGINGFACE_API_KEY` | ⚠️ Optional | AI features            | None (app works without it)    |
| `NEXT_PUBLIC_API_BASE_URL`        | ⚠️ Optional | Alternative API URL    | `http://127.0.0.1:8000/api/v1` |

---

## Important Notes

### 1. `NEXT_PUBLIC_` Prefix

- All environment variables that need to be accessible in the browser **must** start with `NEXT_PUBLIC_`
- Variables without this prefix are only available on the server side

### 2. Build Settings

Make sure your Netlify build settings are:

- **Build command:** `cd website && npm run build`
- **Publish directory:** `website/.next`
- **Node version:** 18.x or 20.x (check your `package.json`)

### 3. CORS Configuration

If your backend API is on a different domain, ensure:

- Backend allows requests from your Netlify domain
- CORS headers are properly configured
- API endpoints are accessible publicly

### 4. Google OAuth Redirect URIs

Update Google Cloud Console with your Netlify URLs:

- Production: `https://your-site.netlify.app/auth/callback`
- Preview: `https://deploy-preview-123--your-site.netlify.app/auth/callback`

---

## Testing Your Environment Variables

After deployment, check the browser console for:

- ✅ Supabase connection logs
- ✅ API calls to your backend
- ❌ Any "Missing environment variables" errors

---

## Troubleshooting

### "Missing Supabase environment variables"

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Ensure they start with `NEXT_PUBLIC_`

### "API calls failing"

- Verify `NEXT_PUBLIC_API_URL` points to your backend
- Check CORS settings on your backend
- Ensure backend is accessible from the internet

### "Google Sign-In not working"

- Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is correct
- Add Netlify domain to Google Cloud Console authorized redirect URIs
- Check browser console for OAuth errors

### "Environment variables not updating"

- Redeploy your site after adding/changing variables
- Clear browser cache
- Check variable names match exactly (case-sensitive)

---

## Security Best Practices

1. ✅ Never commit `.env.local` files to git
2. ✅ Use Netlify dashboard for sensitive values
3. ✅ Rotate API keys regularly
4. ✅ Use different keys for production vs development
5. ✅ Limit API key permissions (read-only when possible)

---

## Quick Setup Checklist

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] Add `NEXT_PUBLIC_API_URL` (pointing to your backend)
- [ ] Add `NEXT_PUBLIC_HUGGINGFACE_API_KEY` (optional)
- [ ] Update Google Cloud Console redirect URIs
- [ ] Configure Netlify build settings
- [ ] Deploy and test

---

**Last Updated:** Based on current codebase analysis
**Next.js Version:** 14.2.26
