# How to See 500 Error Details

A 500 error means the server (Supabase) returned an error. Here's how to see the details:

## Method 1: Check Terminal (Easiest)

**Look at your Expo terminal!** When the error happens, you'll see:
- Red error messages
- Supabase error details
- Error codes and messages

The logs I added will show:
- `Error loading user data:`
- `Error code:`
- `Error message:`
- `Error details:`

## Method 2: Enable Remote Debugging

1. **Shake your phone**
2. Tap **"Debug Remote JS"**
3. **Chrome DevTools opens**
4. Go to **Console** tab
5. Look for red error messages with full details

## Method 3: Check Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to **Logs** > **Postgres Logs** or **API Logs**
3. Look for recent 500 errors
4. Check the error message there

## Common 500 Error Causes

### 1. Database Table Doesn't Exist
**Error:** "relation 'users' does not exist"
**Fix:** Run the database migrations in Supabase SQL Editor

### 2. RLS Policy Blocking
**Error:** "new row violates row-level security policy"
**Fix:** Check RLS policies in migration 003_rls_policies.sql

### 3. Missing Required Field
**Error:** "null value in column violates not-null constraint"
**Fix:** Check database schema matches the code

### 4. Foreign Key Constraint
**Error:** "insert or update on table violates foreign key constraint"
**Fix:** Ensure referenced records exist

## What to Look For

In the terminal, you should see something like:
```
Error loading user data: { code: 'PGRST116', message: '...', details: '...' }
```

**Copy that entire error object** - it tells us exactly what's wrong!

## Quick Check

1. **Open the app** (triggers the error)
2. **Watch the terminal** - error details appear there
3. **Copy the error message** and share it

The error will show:
- Error code (like PGRST116, 23505, etc.)
- Error message
- Details about what failed

