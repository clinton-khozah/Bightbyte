# Troubleshooting: No Logs Showing

## Step 1: Verify Django Server is Running

1. **Check if Django server is running:**

   ```bash
   # In your Django project directory
   python manage.py runserver
   ```

   You should see:

   ```
   Starting development server at http://127.0.0.1:8000/
   ```

2. **Test the health check endpoint:**
   Open your browser and go to:

   ```
   http://localhost:8000/api/v1/interview-videos/health/
   ```

   You should see JSON response AND see this in Django console:

   ```
   ================================================================================
   ✅ HEALTH CHECK ENDPOINT CALLED!
   Method: GET
   Path: /api/v1/interview-videos/health/
   ================================================================================
   ```

## Step 2: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Upload a video
4. Look for request to `/interview-videos/submit/`
5. Click on it and check:
   - **Status**: Should be 200 or 400/500
   - **Request URL**: Should be `http://localhost:8000/api/v1/interview-videos/submit/`
   - **Request Payload**: Should show the JSON data

## Step 3: Check Django Console Output

**IMPORTANT**: The Django console is the terminal/command prompt where you ran `python manage.py runserver`

When you upload a video, you should IMMEDIATELY see:

```
================================================================================
🚀 SUBMIT_VIDEO ENDPOINT CALLED!
================================================================================
Request method: POST
Request path: /api/v1/interview-videos/submit/
...
```

## Step 4: Common Issues

### Issue 1: No output at all

**Possible causes:**

- Django server not running
- Request going to wrong URL
- CORS blocking the request
- Middleware blocking the request

**Solution:**

- Verify Django is running
- Check browser Network tab for errors
- Check browser console for CORS errors

### Issue 2: Request shows in Network tab but no Django logs

**Possible causes:**

- Print statements not flushing
- Request hitting different server
- Django server crashed

**Solution:**

- Check if Django server is still running
- Restart Django server
- Verify API URL in frontend matches Django server

### Issue 3: CORS errors in browser

**Solution:**

- Check `CORS_ALLOWED_ORIGINS` in Django settings
- Make sure frontend URL is allowed

## Step 5: Manual Test

Run this Python script to test the endpoint directly:

```bash
cd edu-spaceAI-API
python test_endpoint.py
```

This will show if Django is receiving requests.

## Step 6: Check Django Logs File

If console output isn't working, check Django log files (if configured):

- Look for `logs/` directory
- Check for any `.log` files

## Still Not Working?

1. **Restart Django server completely**
2. **Check if port 8000 is correct**
3. **Verify API_BASE_URL in frontend matches Django server**
4. **Try the health check endpoint first** - if that doesn't show logs, Django isn't receiving ANY requests





