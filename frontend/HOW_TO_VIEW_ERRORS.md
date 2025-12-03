# How to View Errors on Android

## Method 1: Check Terminal (Easiest)

**Look at the terminal where Expo is running!** 

When you open the app on your phone, errors will appear in the terminal below the QR code. You'll see:
- Red error messages
- Stack traces
- Module not found errors
- Network errors

**The logs appear automatically as you use the app.**

## Method 2: Enable Remote Debugging (Most Detailed)

1. **On your Android phone:**
   - Shake the device (or press Menu button)
   - Tap **"Debug Remote JS"** or **"Debug"**
   - Chrome DevTools will open in your browser

2. **In Chrome DevTools:**
   - Click the **Console** tab
   - You'll see ALL errors, warnings, and console.logs
   - Check **Network** tab for failed API calls

3. **To see React errors:**
   - In Chrome DevTools, go to **Sources** tab
   - Look for red error messages

## Method 3: Error Screen on Phone

The app now shows a red error screen with:
- Error message
- Stack trace (scrollable)
- "Tap to Retry" button

## Method 4: React Native Debugger

1. Install React Native Debugger (optional)
2. Shake phone → "Debug"
3. More advanced debugging tools

## What to Look For

### Common Errors:

1. **"Cannot find module"**
   - Solution: Run `npm install` again

2. **"Network request failed"**
   - Check Supabase URL in .env
   - Check internet connection

3. **"Missing Supabase credentials"**
   - Create `frontend/.env` file
   - Add your Supabase URL and key

4. **"TypeError: Cannot read property"**
   - Component trying to access undefined data
   - Check the error stack trace

## Quick Steps Right Now:

1. **Open the app on your phone** (scan QR code)
2. **Watch the terminal** - errors appear there immediately
3. **If you see a red screen on phone**, read the error message
4. **Shake phone** → "Debug Remote JS" → Check Chrome console

## The Error Will Show:

- **In terminal** (where Expo is running)
- **On phone screen** (red error overlay)
- **In Chrome DevTools** (if remote debugging enabled)

**Start by checking the terminal - that's where errors appear first!**

