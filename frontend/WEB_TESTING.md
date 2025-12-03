# Testing on Web Browser

## Install Web Dependencies

First, install the web dependencies:

```bash
cd frontend
npm install --legacy-peer-deps
```

This will install `react-dom` and `react-native-web` which are needed for web support.

## Run on Web

After installation, start Expo and open in your browser:

```bash
npx expo start --web
```

Or use the npm script:

```bash
npm run web
```

This will:
1. Start the Expo dev server
2. Automatically open your default browser
3. Show the app running at `http://localhost:8081` (or similar)

## Limitations on Web

Some features won't work on web:
- **Camera/QR Scanning**: Web browsers have limited camera access
- **Location Services**: May require HTTPS or have limited accuracy
- **Push Notifications**: Not available on web
- **Native Maps**: May use a different map implementation

But you can test:
- ✅ Navigation and routing
- ✅ UI components and styling
- ✅ Authentication flow
- ✅ API calls to Supabase
- ✅ Basic app structure

## After Web Testing

Once you're ready to test on mobile:
1. Stop the web server (Ctrl+C)
2. Run `npx expo start --lan` for mobile testing
3. Scan the QR code with Expo Go on your phone

