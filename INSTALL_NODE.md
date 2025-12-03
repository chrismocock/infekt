# Installing Node.js and npm

npm comes bundled with Node.js. You need to install Node.js first.

## Option 1: Install Node.js (Recommended)

### Windows Installation Steps:

1. **Download Node.js:**
   - Go to https://nodejs.org/
   - Download the **LTS version** (Long Term Support)
   - Choose the Windows Installer (.msi) for your system (64-bit or 32-bit)

2. **Run the Installer:**
   - Double-click the downloaded `.msi` file
   - Click "Next" through the installation wizard
   - **Important:** Make sure "Add to PATH" is checked (it should be by default)
   - Click "Install"
   - Wait for installation to complete

3. **Verify Installation:**
   - Close and reopen your Command Prompt or PowerShell
   - Run these commands:
     ```bash
     node --version
     npm --version
     ```
   - You should see version numbers (e.g., `v18.17.0` and `9.6.7`)

4. **If it still doesn't work:**
   - Restart your computer (sometimes needed for PATH to update)
   - Or manually add Node.js to PATH:
     - Find where Node.js was installed (usually `C:\Program Files\nodejs\`)
     - Add that path to your system PATH environment variable

## Option 2: Using a Package Manager

### Using Chocolatey (if you have it):

```bash
choco install nodejs
```

### Using Winget (Windows 10/11):

```bash
winget install OpenJS.NodeJS.LTS
```

## Option 3: Using nvm-windows (Node Version Manager)

If you want to manage multiple Node.js versions:

1. Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
2. Install it
3. Then install Node.js:
   ```bash
   nvm install lts
   nvm use lts
   ```

## After Installation

Once Node.js is installed:

1. **Close and reopen your terminal/command prompt**
2. **Navigate to the frontend directory:**
   ```bash
   cd C:\Code\Infekt\frontend
   ```
3. **Run npm install:**
   ```bash
   npm install
   ```

## Troubleshooting

### "npm is not recognized" after installation

1. **Restart your terminal/command prompt** (close and reopen)
2. **Restart your computer** (sometimes needed)
3. **Check PATH manually:**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab > "Environment Variables"
   - Under "System variables", find "Path"
   - Check if `C:\Program Files\nodejs\` is in the list
   - If not, add it

### "Permission denied" errors

- Run Command Prompt or PowerShell as Administrator
- Or install Node.js for your user only (not system-wide)

### Still having issues?

Try using **Git Bash** or **Windows Subsystem for Linux (WSL)** instead of Command Prompt.

## Quick Test

After installation, verify everything works:

```bash
node --version    # Should show: v18.x.x or v20.x.x
npm --version     # Should show: 9.x.x or 10.x.x
```

Once both commands work, you're ready to run `npm install` in the frontend directory!

