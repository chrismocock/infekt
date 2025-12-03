# Fix Missing Dependencies

## Missing Dependencies for expo-router

expo-router requires several dependencies. Install them all:

```bash
cd frontend
npm install react-native-safe-area-context expo-linking --legacy-peer-deps
```

**Or use Expo's install command (recommended):**
```bash
npx expo install react-native-safe-area-context expo-linking
```

This automatically installs the correct versions for your SDK.

## Also Fixed

- Removed deprecated `expo-router/babel` from babel.config.js (not needed in SDK 50+)
- Added `expo-linking` to package.json

## After Installing

1. **Install missing packages:**
   ```bash
   npx expo install react-native-safe-area-context expo-linking
   ```

2. **Restart Expo:**
   - Press `Ctrl+C` to stop
   - Run `npx expo start --lan` again

3. **Reload the app** on your phone

The app should now bundle successfully!

## If More Dependencies Are Missing

If you see more "Unable to resolve" errors, run:
```bash
npx expo install --fix
```

This will automatically install all missing dependencies with correct versions.

