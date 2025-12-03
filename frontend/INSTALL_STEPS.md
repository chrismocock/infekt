# Installation Steps

## Step 1: Install All Dependencies

First, install everything that's in package.json:

```bash
cd frontend
npm install --legacy-peer-deps
```

This will install all packages including the ones we just added.

## Step 2: Fix Missing Dependencies

After npm install completes, run:

```bash
npx expo install --fix
```

This will check for any remaining missing dependencies and install them with correct versions.

## Step 3: Restart Expo

```bash
npx expo start --lan
```

## Why --legacy-peer-deps?

Some packages have peer dependency conflicts. The `--legacy-peer-deps` flag tells npm to use the old (more permissive) dependency resolution algorithm, which works better with Expo's dependency tree.

