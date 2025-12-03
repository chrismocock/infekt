# Fix 500 Error: Metro Bundler Entry Bundle

## The Problem

You're seeing:
```
GET http://localhost:8081/node_modules/expo-router/entry.bundle?... net::ERR_ABORTED 500
MIME type ('application/json') is not executable
```

This means Metro bundler is encountering an error during build and returning JSON (error response) instead of JavaScript.

## Solution Steps

### Step 1: Stop the Server

Press `Ctrl+C` in the terminal where Expo is running.

### Step 2: Clear All Caches

```bash
cd frontend

# Clear Metro bundler cache
npx expo start -c

# If that doesn't work, also clear npm cache
npm cache clean --force

# Clear watchman (if installed)
watchman watch-del-all

# Clear Expo cache
rm -rf .expo
rm -rf node_modules/.cache
```

### Step 3: Reinstall Dependencies

```bash
# Remove node_modules and package-lock
rm -rf node_modules
rm -rf package-lock.json

# Reinstall
npm install
```

### Step 4: Check for Build Errors

Start the server with verbose logging:

```bash
npx expo start --web --clear
```

**Look at the terminal output** - you should see the actual error that's causing the 500. Common errors:
- Missing dependencies
- Syntax errors in code
- Import errors
- TypeScript errors

### Step 5: Check Common Issues

#### Missing Dependencies

Make sure all dependencies are installed:
```bash
npm install --legacy-peer-deps
```

#### TypeScript Errors

Check for TypeScript errors:
```bash
npx tsc --noEmit
```

#### Check Entry Point

Verify `package.json` has:
```json
{
  "main": "expo-router/entry"
}
```

### Step 6: Try Alternative Start Methods

If web is failing, try:

```bash
# Start without web first
npx expo start --clear

# Then press 'w' to open web
```

Or start web directly:
```bash
npx expo start --web --clear
```

## Most Common Causes

1. **Corrupted Cache** - Fixed by clearing cache (Step 2)
2. **Missing Dependencies** - Fixed by reinstalling (Step 3)
3. **Build Error** - Check terminal output (Step 4)
4. **TypeScript Error** - Run `npx tsc --noEmit` to find errors

## If Still Not Working

1. **Check Terminal Output** - The actual error message will be in the terminal
2. **Share the Error** - Copy the full error from terminal (not just browser console)
3. **Check Node Version** - Should be Node 18+: `node --version`
4. **Try Different Port** - Sometimes port 8081 is in use:
   ```bash
   npx expo start --port 8082
   ```

## Quick Fix (Try This First)

```bash
cd frontend
rm -rf node_modules .expo
npm install
npx expo start --web --clear
```

Then check the terminal for the actual error message!

