# Debugging Infekt App

## View Logs in Terminal

The Expo terminal where you ran `npx expo start` shows all logs. Look for:
- Red error messages
- Yellow warnings
- Stack traces

## Enable Remote Debugging

1. **Shake your phone** (or press `Cmd+D` on iOS / `Cmd+M` on Android emulator)
2. Select **"Debug Remote JS"**
3. This opens Chrome DevTools where you can see:
   - Console logs
   - Network requests
   - React component errors

## Check Common Issues

### 1. Missing Environment Variables

Check if `.env` file exists and has:
```
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
```

### 2. Supabase Connection Errors

If you see Supabase errors:
- Check your Supabase project is active
- Verify the URL and anon key are correct
- Check network connectivity

### 3. Component Errors

Common errors:
- Missing imports
- Undefined components
- Type errors

## View Logs in Expo Go

1. Shake your device
2. Tap "Show Dev Menu"
3. Tap "Debug Remote JS"
4. Open Chrome DevTools (should open automatically)
5. Check the Console tab for errors

## Enable Error Overlay

Errors should automatically show as a red screen. Tap it to see details.

## Check Metro Bundler Logs

In your terminal where Expo is running, you'll see:
- Bundle compilation errors
- Module resolution errors
- Runtime errors

## Common Error Messages

### "Cannot find module"
- Run `npm install` again
- Clear cache: `npx expo start -c`

### "Network request failed"
- Check Supabase URL is correct
- Check internet connection
- Verify CORS settings

### "TypeError: Cannot read property"
- Check if data exists before accessing
- Add null checks

## Get Full Error Details

1. Look at the terminal output
2. Check the red error screen on your phone
3. Enable remote debugging (see above)
4. Check Chrome DevTools console

