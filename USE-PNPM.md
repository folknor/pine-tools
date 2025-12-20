# 🚨 IMPORTANT: Use pnpm!

This project uses **pnpm** as the package manager.

## Always use:
```bash
pnpm install          # Install dependencies
pnpm run <script>    # Run npm scripts
pnpm run build       # Build the project
pnpm run test        # Run tests
```

## Never use:
- `npm install` ❌
- `npm run <script>` ❌  
- `yarn install` ❌
- `yarn run <script>` ❌

## Why pnpm?
- Faster installation times
- Better disk space efficiency
- Consistent dependency resolution
- This project is configured for pnpm specifically

The project includes pnpm-specific configurations and optimizations that won't work with npm/yarn.