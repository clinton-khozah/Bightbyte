# How to Check if Video Analysis is Running

## Important: Check Django Server Console, NOT Browser Console

The video analysis happens on the **Django backend server**, so you need to check the **Django server terminal/console**, not the browser console.

## Step-by-Step Guide

### 1. Find Your Django Server Terminal

- Look for the terminal/command prompt where you ran `python manage.py runserver`
- This is where Django logs will appear
- It should show something like: `Starting development server at http://127.0.0.1:8000/`

### 2. Upload a Video

- Go to the profile review page
- Record or upload a video
- Click "Upload Video"

### 3. Watch the Django Server Console

You should see output like this:

```
================================================================================
🚀 SUBMIT_VIDEO ENDPOINT CALLED!
================================================================================
📋 Received data:
   user_id: abc123...
   question_id: 1
   video_url: https://...
   video_duration: 65.5
✅ All validations passed, proceeding with analysis...
🔧 Initializing VideoAnalyzer...
✅ VideoAnalyzer initialized
================================================================================
🎬 VIDEO SUBMISSION STARTED
User ID: abc123...
Question ID: 1
Video URL: https://...
================================================================================
📥 Downloading video from: https://...
Video downloaded to C:\Users\...\tmpXXXXXX.webm
🔍 Starting OpenCV video analysis...
📁 Video file path: C:\Users\...\tmpXXXXXX.webm
🔍 [VideoAnalyzer] Opening video file: C:\Users\...\tmpXXXXXX.webm
📁 [VideoAnalyzer] Video file size: 1234567 bytes
🎥 [VideoAnalyzer] Attempting to open video with OpenCV...
✅ [VideoAnalyzer] Video opened successfully!
📹 [VideoAnalyzer] Video properties: FPS=30.0, Total frames=1950
🎬 [VideoAnalyzer] Starting frame analysis (sampling every 5 frames)...
   Analyzing frame 10...
   Analyzing frame 20...
   ...
📊 [VideoAnalyzer] Finished reading frames. Total read: 1950
✅ Analyzed 390 frames out of 1950 total frames
📊 Video analysis summary:
  - Frames analyzed: 390/1950
  - Cheating frames: 5 (1.3%)
  - Phone detections: 0
  - Reading detections: 3
  - Multiple people: 0
  - No face: 2
  - Cheating detected: False
✅ Analysis complete!
📊 Results: {...}
```

## If You See Nothing

1. **Check if Django server is running**: Look for the terminal with Django server
2. **Check if request is reaching Django**: Look for the "🚀 SUBMIT_VIDEO ENDPOINT CALLED!" message
3. **Check browser Network tab**: Open DevTools → Network tab → Look for the `/interview-videos/submit/` request
4. **Check API URL**: Make sure `NEXT_PUBLIC_API_URL` is set correctly or defaults to `http://localhost:8000/api/v1`

## If You See Errors

- **"Could not open video file"**: OpenCV can't read the video format
- **"No frames were analyzed"**: Video might be corrupted
- **"Failed to download video"**: Video URL is not accessible

## Browser Console vs Django Console

- **Browser Console (F12)**: Shows frontend logs (React, JavaScript)
- **Django Console**: Shows backend logs (Python, API, analysis)

**You need to check BOTH:**

- Browser console: To see if the request is being sent
- Django console: To see if analysis is running





