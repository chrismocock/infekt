# How to View Logs and Debug Errors

## 1. Check Terminal Output

**The Expo terminal shows all errors!** Look at the terminal where you ran `npx expo start`. You should see:
- Red error messages
- Stack traces
- Module not found errors
- Network errors

## 2. Enable Remote Debugging (Best Method)

1. **On your Android phone:**
   - Shake the device (or press `Cmd+M` / `Menu` button)
   - Tap **"Debug Remote JS"**
   - Chrome DevTools will open automatically

2. **In Chrome DevTools:**
   - Go to **Console** tab
   - You'll see all JavaScript errors, console.logs, and warnings
   - Check **Network** tab for failed API calls

## 3. View Error Screen on Phone

The app now shows a red error screen with:
- Error message
- Stack trace
- "Tap to Retry" button

## 4. Check for Common Issues

### Missing .env file
Check if `frontend/.env` exists with:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-token
```

### Supabase Connection
- Check console for "MISSING" warnings
- Verify Supabase project is active
- Check network connection

### Module Errors
- Run `npm install` again
- Clear cache: `npx expo start -c`

## 5. Quick Debug Steps

1. **Look at terminal** - errors appear there first
2. **Shake phone** → "Debug Remote JS" → Check Chrome console
3. **Check error screen** on phone for details
4. **Verify .env file** exists and has correct values

## 6. Enable Verbose Logging

Add this to see more logs:
```javascript
// In any component
console.log('Debug:', yourVariable);
```

Logs appear in:
- Terminal (Metro bundler)
- Chrome DevTools console (if remote debugging enabled)
- React Native Debugger

## Most Common Error

**"Missing Supabase credentials"** - Create `frontend/.env` file with your Supabase URL and key!

