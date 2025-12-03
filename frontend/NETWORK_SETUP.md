# Network Setup for Expo

## Problem: 127.0.0.1 Only Works on Same Device

`exp://127.0.0.1:8081` only works if:
- You're using an emulator on the same computer
- You're testing on web browser

**For a physical phone, you need your computer's IP address!**

## Solution: Use Network IP

### Option 1: Find Your Computer's IP (Recommended)

**Windows:**
1. Open Command Prompt
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your WiFi adapter
4. It will be something like: `192.168.1.169`

**Then use:** `exp://192.168.1.169:8081` (replace with your actual IP)

### Option 2: Use Tunnel Mode

Restart Expo with tunnel:
```bash
npx expo start --tunnel
```

This creates a public URL that works from anywhere (slower but more reliable).

### Option 3: Use LAN Mode

Restart Expo with LAN:
```bash
npx expo start --lan
```

This automatically uses your network IP.

## Quick Fix Right Now

1. **Find your IP:**
   - Windows: Run `ipconfig` in Command Prompt
   - Look for "IPv4 Address" (usually 192.168.x.x)

2. **Restart Expo with LAN:**
   ```bash
   npx expo start --lan
   ```

3. **Scan the new QR code** - it will have your network IP instead of 127.0.0.1

## Requirements

- Phone and computer must be on the **same WiFi network**
- Firewall must allow port 8081
- If it still doesn't work, use `--tunnel` mode

