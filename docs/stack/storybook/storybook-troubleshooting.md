# Storybook Stack - Troubleshooting

**CANONICAL SOURCE**: Storybook-specific issue resolution and debugging.

## Development Server Issues

### Problem: Storybook fails to start
**Symptoms:**
- Server won't start on port 6006
- Build errors during startup
- Missing dependencies errors

**Solutions:**
```bash
# 1. Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Check port availability
lsof -ti:6006 | xargs kill -9  # Kill processes on port 6006
npm run dev

# 3. Update Storybook
npx storybook@latest upgrade

# 4. Check for conflicting packages
npm ls @storybook/react
npm dedupe
```

### Problem: Stories not loading or updating
**Symptoms:**
- Stories don't appear in sidebar
- Changes not reflected in Storybook
- Hot reload not working

**Solutions:**
```bash
# 1. Restart with cache clear
npm run dev -- --no-manager-cache

# 2. Check story file patterns in main.ts
// .storybook/main.ts
stories: [
  '../src/**/*.stories.@(js|jsx|ts|tsx)',
  '../src/**/*.stories.mdx'
]

# 3. Verify story export format
export default {
  title: 'Components/Button',  // Must have title
  component: Button,           // Must export component
};

# 4. Check for TypeScript errors
npm run type-check
```

## Build Issues

### Problem: Build-storybook fails
**Symptoms:**
- Static build process fails
- Missing chunks or assets
- TypeScript compilation errors

**Solutions:**
```bash
# 1. Check build configuration
// .storybook/main.ts
export default {
  // Ensure all addons are compatible
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-docs'
  ]
};

# 2. Fix TypeScript issues
npm run type-check
# Fix all TypeScript errors before building

# 3. Memory issues during build
NODE_OPTIONS="--max-old-space-size=4096" npm run build-storybook

# 4. Check for addon conflicts
# Remove addons one by one to identify conflicts
```

### Problem: Package build fails
**Symptoms:**
- Rollup/Vite build errors
- Missing type declarations
- CSS not building properly

**Solutions:**
```bash
# 1. Check rollup configuration
// rollup.config.cjs
external: [
  'react',           # Don't bundle React
  'react-dom',       # Don't bundle React DOM
  '@types/react'     # Don't bundle types
]

# 2. Fix TypeScript configuration
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "dist/types",
    "outDir": "dist"
  }
}

# 3. CSS build issues
// Ensure PostCSS config is correct
// postcss.config.cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
};

# 4. Clean build directory
rm -rf dist/
npm run build
```

## Component Issues

### Problem: Components not rendering correctly
**Symptoms:**
- Components appear broken in Storybook
- Styling not applied
- Props not working

**Solutions:**
```typescript
// 1. Check component imports
import React from 'react';  // Always import React
import type { Meta, StoryObj } from '@storybook/react';

// 2. Verify CSS imports in preview.ts
// .storybook/preview.ts
import '../src/global.css';  // Global styles
import 'tailwindcss/tailwind.css';  // If using CDN

// 3. Check Tailwind configuration
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",  // Include all source files
    "./.storybook/**/*.{js,jsx,ts,tsx}"  // Include Storybook files
  ]
};

// 4. Verify prop types and interfaces
interface ButtonProps {
  children: React.ReactNode;  // Always include children type
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}
```

### Problem: Stories show TypeScript errors
**Symptoms:**
- Red error messages in Storybook
- Type mismatch warnings
- Props not recognized

**Solutions:**
```typescript
// 1. Fix story meta configuration
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary']
    }
  }
} satisfies Meta<typeof Button>;

// 2. Proper story typing
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button text',
    variant: 'primary'
  }
};

// 3. Fix component prop interfaces
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '' }) => {
  // Component implementation
};
```

## Styling Issues

### Problem: Tailwind CSS not working
**Symptoms:**
- Classes not applied
- Styles not generating
- PostCSS errors

**Solutions:**
```bash
# 1. Check Tailwind content configuration
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./.storybook/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // Custom theme extensions
    }
  }
};

# 2. Verify PostCSS setup in Storybook
// .storybook/main.ts
addons: [
  {
    name: "@storybook/addon-postcss",
    options: {
      postcssLoaderOptions: {
        implementation: require('postcss')
      }
    }
  }
]

# 3. Check CSS imports order
// .storybook/preview.ts
import '../src/global.css';  // Should be first

# 4. Rebuild Tailwind
npx tailwindcss -i ./src/global.css -o ./dist/output.css --watch
```

### Problem: Design tokens not working
**Symptoms:**
- Token values not applied
- Theme switching not working
- CSS variables not generated

**Solutions:**
```typescript
// 1. Verify token file structure
// tokens/BriggsDefault.json
{
  "colors": {
    "primary": {
      "500": "#3b82f6"
    }
  }
}

// 2. Check token integration in Tailwind
// tailwind.config.js
const { getTokens } = require('./src/tokens');
const tokens = getTokens(process.env.THEME || 'BriggsDefault');

module.exports = {
  theme: {
    extend: {
      colors: tokens.colors,
      fontSize: tokens.typography.fontSize
    }
  }
};

// 3. Verify token loading function
// tokens/index.ts
export const getTokens = (theme: string = 'BriggsDefault') => {
  try {
    return require(`./${theme}.json`);
  } catch (error) {
    console.warn(`Theme ${theme} not found, falling back to BriggsDefault`);
    return require('./BriggsDefault.json');
  }
};
```

## Deployment Issues

### Problem: Docker build fails
**Symptoms:**
- Container build errors
- Missing dependencies in container
- Port binding issues

**Solutions:**
```dockerfile
# 1. Optimize Dockerfile
FROM node:20.18.3-alpine3.21

# Install system dependencies
RUN apk update && apk add xdg-utils --no-cache

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build-storybook

# Expose correct port
EXPOSE 6006

# Use correct start command
CMD ["npm", "run", "storybook"]

# 2. Check .dockerignore
node_modules
dist
storybook-static
*.log
.git

# 3. Verify package.json scripts
{
  "scripts": {
    "storybook": "storybook dev -p 6006 --host 0.0.0.0"
  }
}
```

### Problem: NPM package publishing fails
**Symptoms:**
- Package not found after publish
- Import errors in consuming projects
- Missing files in package

**Solutions:**
```json
// 1. Check package.json configuration
{
  "name": "@briggs-walker/briggsdesignsystem",
  "version": "1.0.0",
  "main": "dist/index.cjs.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "publishConfig": {
    "registry": "https://npm.pkg.github.com/"
  }
}

// 2. Verify build outputs
ls -la dist/
# Should contain:
# - index.cjs.js
# - index.esm.js
# - index.d.ts
# - briggs-design-system.css

// 3. Test package locally
npm pack
# Check generated .tgz file contents

// 4. Authentication for GitHub packages
npm login --registry=https://npm.pkg.github.com/
```

## Performance Issues

### Problem: Storybook loads slowly
**Symptoms:**
- Long startup times
- Slow story switching
- High memory usage

**Solutions:**
```typescript
// 1. Optimize story loading
// .storybook/main.ts
export default {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  features: {
    buildStoriesJson: true,
    storyStoreV7: true  // Enable faster story loading
  }
};

// 2. Lazy load components in stories
const LazyComponent = React.lazy(() => import('./Component'));

export const Default: Story = {
  render: (args) => (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent {...args} />
    </Suspense>
  )
};

// 3. Reduce addon usage
// Only include necessary addons
addons: [
  '@storybook/addon-essentials',  // Core functionality
  '@storybook/addon-docs'         // Documentation only
]

// 4. Optimize webpack configuration
// .storybook/main.ts
webpackFinal: async (config) => {
  config.optimization = {
    ...config.optimization,
    splitChunks: {
      chunks: 'all'
    }
  };
  return config;
}
```

## Integration Issues

### Problem: Components don't work in consuming applications
**Symptoms:**
- Import errors
- Styling conflicts
- Runtime errors

**Solutions:**
```typescript
// 1. Check peer dependencies
// package.json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "tailwindcss": "^4.0.0"
  }
}

// 2. Verify CSS integration in consuming app
// Import styles in consuming application
import '@briggs-walker/briggsdesignsystem/dist/briggs-design-system.css';

// 3. Update Tailwind content in consuming app
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@briggs-walker/briggsdesignsystem/**/*.{js,jsx,ts,tsx}"
  ]
};

// 4. Check for React version conflicts
npm ls react
# Ensure single React version across project
```
