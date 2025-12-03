# EAS Build Troubleshooting Guide

## Permission Denied Errors

If you're seeing `tar: Cannot mkdir: Permission denied` or `tar: Cannot open: Permission denied` errors, follow these steps:

### Step 1: Close File Locks

**Before running the build:**
1. Close all files in your IDE/editor
2. Close any File Explorer windows in the project directory
3. Stop any running Expo/Metro bundler processes:
   ```powershell
   # Stop any running node processes related to Expo
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
4. Check for antivirus or Windows Search Indexer that might be locking files

### Step 2: Verify Build Setup

Run the verification script:
```powershell
cd frontend
.\verify-build-setup.ps1
```

This will check:
- Required files exist (.easignore, eas.json, eas-build.ps1)
- You're in the correct directory
- No conflicting processes are running
- EAS CLI is installed

### Step 3: Clean Build Environment

Clear caches that might cause issues:
```powershell
cd frontend

# Remove Expo cache
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Clear npm cache (optional)
npm cache clean --force
```

### Step 4: Run Build with Helper Script

**Always use the helper script** which sets `EAS_NO_VCS=1`:

```powershell
cd frontend

# For Android
.\eas-build.ps1 build --platform android

# For iOS
.\eas-build.ps1 build --platform ios
```

**Alternative (manual):**
```powershell
cd frontend
$env:EAS_NO_VCS = "1"
eas build --platform android
```

### Step 5: If Permission Issues Persist

1. **Run PowerShell as Administrator:**
   - Right-click PowerShell
   - Select "Run as Administrator"
   - Navigate to frontend directory and try again

2. **Check File Permissions:**
   ```powershell
   # Verify you have read/write access
   icacls frontend
   ```

3. **Exclude Project from Antivirus:**
   - Add `C:\Code\Infekt` to your antivirus exclusion list
   - Windows Defender: Settings > Virus & threat protection > Exclusions

4. **Disable Windows Search Indexer Temporarily:**
   - Services > Windows Search > Stop (temporarily)

## What the .easignore File Does

The `.easignore` file excludes unnecessary files from the build archive, which:
- Reduces archive size
- Speeds up upload
- Prevents permission issues with cache/temp files
- Excludes files that shouldn't be in production builds

## Common Issues

### "Cannot mkdir: Permission denied"
- **Cause:** Directory already exists and is locked
- **Fix:** Close all file explorers, IDE windows, and processes accessing the directory

### "Cannot open: Permission denied"
- **Cause:** File is locked by another process
- **Fix:** Close the file in your IDE, stop Metro bundler, check antivirus

### "No such file or directory"
- **Cause:** File was moved/deleted or path is incorrect
- **Fix:** Verify file exists, check .easignore isn't excluding it incorrectly

## Verification

After fixing issues, verify the setup:
```powershell
cd frontend
.\verify-build-setup.ps1
```

Then attempt the build again.

