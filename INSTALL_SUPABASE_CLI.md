# Installing Supabase CLI on Windows

Supabase CLI cannot be installed via `npm install -g`. Use one of these methods instead:

## Option 1: Using Scoop (Recommended)

### Step 1: Install Scoop (if you don't have it)

Open PowerShell and run:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Step 2: Install Supabase CLI

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 3: Verify Installation

```powershell
supabase --version
```

---

## Option 2: Using winget (Windows 10/11)

If you have Windows 10/11 with winget:

```powershell
winget install --id=Supabase.CLI
```

---

## Option 3: Using Chocolatey

If you have Chocolatey installed:

```powershell
choco install supabase
```

---

## Option 4: Manual Installation (Standalone Binary)

1. Go to: https://github.com/supabase/cli/releases
2. Download the latest `supabase_windows_amd64.zip`
3. Extract the zip file
4. Copy `supabase.exe` to a folder in your PATH (e.g., `C:\Program Files\supabase\`)
5. Add that folder to your system PATH environment variable

---

## After Installation

Once installed, verify it works:

```powershell
supabase --version
```

Then you can proceed with:

```powershell
cd C:\Code\Infekt\backend
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Quick Start (Using Scoop)

If you want the fastest method, use Scoop:

```powershell
# Install Scoop (one-time setup)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify
supabase --version
```

This is the recommended method for Windows users.

