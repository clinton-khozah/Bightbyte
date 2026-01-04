# Google Sign-In Domain Setup Guide

## Where to Go

**Google Cloud Console:** https://console.cloud.google.com/

## Step-by-Step Instructions

### Step 1: Access Google Cloud Console

1. Go to **https://console.cloud.google.com/**
2. Sign in with your Google account (the one you want to use for OAuth)

### Step 2: Create or Select a Project

1. Click the **project dropdown** at the top of the page
2. Either:
   - **Select an existing project** (if you already have one)
   - **Click "New Project"** to create a new one
   - Name it something like "Brightbyt" or "Brightbyte"
   - Click **"Create"**

### Step 3: Enable Google+ API / Google Identity Services

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"Google Identity"**
3. Click on it and click **"Enable"**

**Note:** Modern Google Sign-In uses Google Identity Services, but you may need to enable Google+ API for OAuth.

### Step 4: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (left sidebar)
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**

**Fill in the required information:**
- **App name:** Brightbyt (or Brightbyte)
- **User support email:** Select your email (clintonkhozah@gmail.com)
- **Developer contact information:** Your email
- Click **"Save and Continue"**

**Scopes (Step 2):**
- Click **"Add or Remove Scopes"**
- Add these scopes:
  - `email`
  - `profile`
  - `openid`
- Click **"Update"** then **"Save and Continue"**

**Test users (Step 3):**
- If your app is in "Testing" mode, add test user emails
- Click **"Save and Continue"**

**Summary:**
- Review everything and click **"Back to Dashboard"**

### Step 5: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**

**If prompted:**
- **Application type:** Select **"Web application"**
- **Name:** Brightbyt Web Client (or any name you prefer)

**Authorized JavaScript origins:**
Add these URLs (one per line):
```
https://brightbyte.co.za
https://www.brightbyte.co.za
https://your-site.netlify.app
http://localhost:3000
```

**Authorized redirect URIs:**
Add these URLs (one per line):
```
https://brightbyte.co.za/auth/callback
https://www.brightbyte.co.za/auth/callback
https://your-site.netlify.app/auth/callback
http://localhost:3000/auth/callback
https://qvyofdffddwgpduljlit.supabase.co/auth/v1/callback
```

**Important:** Replace `your-site.netlify.app` with your actual Netlify domain if different.

4. Click **"Create"**
5. **Copy the Client ID** - You'll need this for your environment variable
6. **Copy the Client Secret** (if shown) - Keep this secure

### Step 6: Add Authorized Domains

1. Still in **"OAuth consent screen"** → **"Publishing status"** tab
2. Scroll down to **"Authorized domains"**
3. Click **"+ ADD DOMAIN"**
4. Add your domain: **brightbyte.co.za** (without https:// or www)
5. Click **"Add"**

**Note:** You can also add:
- `netlify.app` (if using Netlify)
- `localhost` (for local development)

### Step 7: Update Your Environment Variables

Add the Client ID to your environment variables:

**In Netlify:**
1. Go to your Netlify site dashboard
2. **Site settings** → **Environment variables**
3. Add or update:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```

**In your local `.env.local` file:**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### Step 8: Publish Your App (Optional but Recommended)

If your app is in "Testing" mode:

1. Go to **"OAuth consent screen"**
2. Click **"PUBLISH APP"** button
3. Confirm the publishing

**Note:** Publishing makes your app available to all users. Testing mode limits it to test users only.

## Quick Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent
- **Credentials:** https://console.cloud.google.com/apis/credentials
- **APIs Library:** https://console.cloud.google.com/apis/library

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure your redirect URI is exactly added in "Authorized redirect URIs"
- Check for trailing slashes, http vs https, etc.

### "Error 403: access_denied"
- Your app might be in "Testing" mode
- Add the user's email to "Test users" in OAuth consent screen
- Or publish your app

### Domain not working
- Make sure domain is added in "Authorized domains"
- Wait a few minutes for changes to propagate
- Clear browser cache

## Current Configuration

Based on your code, you're using:
- **Client ID:** `987266730923-tc532dfe6e7ninoci6f230svs5jidbrp.apps.googleusercontent.com`

Make sure this Client ID has:
- ✅ Your domain (`brightbyte.co.za`) in Authorized JavaScript origins
- ✅ Your domain redirect URIs in Authorized redirect URIs
- ✅ Your domain in Authorized domains

## Need Help?

- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- Google Cloud Console Help: https://cloud.google.com/docs

