# How to Start the Infekt App

## Quick Start (Web Browser)

1. **Open a terminal in the `frontend` folder:**
   ```bash
   cd C:\Code\Infekt\frontend
   ```

2. **Clear cache and start the app:**
   ```bash
   npx expo start --web --clear
   ```

3. **Wait for the browser to open automatically** - it should open at `http://localhost:8081`

## If You Get a 500 Error

The 500 error means Metro bundler is having trouble building. Try these steps:

### Step 1: Stop Any Running Servers
Press `Ctrl+C` in any terminal windows running Expo.

### Step 2: Clear All Caches
```bash
cd C:\Code\Infekt\frontend

# Clear Expo cache
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Clear npm cache
npm cache clean --force
```

### Step 3: Start Fresh
```bash
npx expo start --web --clear
```

### Step 4: Check Terminal Output
**IMPORTANT:** Look at the terminal where Expo is running. If there's an error, you'll see it there in red text. Common issues:
- Missing `.env` file (needs Supabase credentials)
- Missing dependencies
- Build errors

## Starting for Different Platforms

### Web Browser (Testing)
```bash
cd frontend
npm run web
# or
npx expo start --web
```

### Mobile Device (Expo Go)
```bash
cd frontend
npm start
# Then:
# - Press 'a' for Android
# - Press 'i' for iOS
# - Scan QR code with Expo Go app
```

### Android Emulator
```bash
cd frontend
npm run android
# or
npx expo start --android
```

### iOS Simulator (Mac only)
```bash
cd frontend
npm run ios
# or
npx expo start --ios
```

## Troubleshooting

### "Cannot find module" errors
```bash
cd frontend
npm install
npx expo start --web --clear
```

### Still getting 500 error?
1. **Check the terminal output** - the actual error will be shown there
2. **Verify `.env` file exists** in `frontend/.env` with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
   ```
3. **Check TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

## What to Expect

When the app starts successfully:
- Terminal shows: "Metro waiting on..."
- Browser opens automatically (for web)
- You should see the app loading screen or onboarding

If you see a blank page or error:
- Check the browser console (F12 → Console tab)
- Check the terminal for error messages
- Make sure `.env` file is configured

