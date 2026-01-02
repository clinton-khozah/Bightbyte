# 🚀 Start Django Backend Server

## The Issue

You're getting `ERR_CONNECTION_REFUSED` because the Django backend server is not running.

## Quick Fix

### Step 1: Navigate to Backend Directory

```powershell
cd edu-spaceAI-API
```

### Step 2: Start the Server

```powershell
python manage.py runserver
```

Or if you're using Python 3 specifically:

```powershell
python3 manage.py runserver
```

### Step 3: Verify Server is Running

You should see output like:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

### Step 4: Test the API Endpoint

Open your browser and go to:
```
http://127.0.0.1:8000/api/v1/mentors/storage/create-payment-intent/
```

You should see an error (which is expected without POST data), but it confirms the server is running.

## Alternative: Run on Different Port

If port 8000 is already in use:

```powershell
python manage.py runserver 8001
```

Then update `API_BASE_URL` in `website/app/dashboard/tutor/storage/page.tsx` to:
```typescript
const API_BASE_URL = "http://127.0.0.1:8001"
```

## Keep Server Running

**Important:** Keep the terminal window with the Django server running. Don't close it while using the application.

## Troubleshooting

### If you get "ModuleNotFoundError"
Make sure you're in a virtual environment with dependencies installed:

```powershell
# Create virtual environment (if not exists)
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### If you get "Port already in use"
Kill the process using port 8000:

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## Next Steps

Once the server is running:
1. Go back to the storage upgrade page
2. Click "Upgrade Now" on any storage plan
3. The payment modal should now open with the Stripe payment form

