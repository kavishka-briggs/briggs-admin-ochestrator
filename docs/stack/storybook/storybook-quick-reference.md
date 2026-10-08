# Storybook Stack - Quick Reference

**CANONICAL SOURCE**: Storybook-specific ports, environment variables, and configuration.

## 1. Storybook Ports & URLs

### Development
- **Storybook Dev Server**: `http://localhost:6006`
- **Build Preview**: `http://localhost:6006` (after build)

### Production
- **Container Port**: `6006`
- **Exposed Port**: `80` (via reverse proxy)

## 2. Environment Variables

### Build Environment
```bash
# Storybook specific
NODE_ENV=production              # Production mode for optimized builds
THEME=BriggsDefault             # Design token theme selection

# Build outputs
STORYBOOK_OUTPUT_DIR=storybook-static
NPM_PACKAGE_OUTPUT=dist/
```

### Runtime Configuration
```bash
# Design system theme
THEME=BriggsDefault|BriggsDark   # Available themes

# Container settings
PORT=6006                        # Container port
HOST=0.0.0.0                    # Container host binding
```

## 3. Common Commands

### Development
```bash
# Start Storybook development server
npm run dev
npm run storybook

# Build static Storybook
npm run build-storybook

# Build NPM package
npm run build

# Link for local development
npm run link
```

### Package Management
```bash
# Install design system in another project
npm install @briggs-walker/briggsdesignsystem

# Local linking for development
npm link @briggs-walker/briggsdesignsystem
```

### Docker Operations
```bash
# Build container
docker build -t briggsdesignsystem-storybook .

# Run container
docker run -p 6006:6006 briggsdesignsystem-storybook

# Run with theme override
docker run -e THEME=BriggsDark -p 6006:6006 briggsdesignsystem-storybook
```

## 4. Configuration Patterns

### Storybook Configuration
```typescript
// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-docs',
    '@storybook/addon-postcss'
  ],
  framework: '@storybook/react-webpack5'
}
```

### Component Export Pattern
```typescript
// src/index.ts
export { default as Button } from './components/Button/Button';
export { default as Card } from './components/Card/Card';
// ... all components
```

### Story Structure
```typescript
// Component.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import Component from './Component';

const meta: Meta<typeof Component> = {
  component: Component,
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
    // component props
  },
};
```

## 5. File Structure

```
briggsdesignsystem/
├── .storybook/                 # Storybook configuration
│   ├── main.ts                # Main config
│   └── preview.ts             # Preview config
├── src/
│   ├── components/            # Component library
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.stories.tsx
│   │   └── [Component]/
│   ├── tokens/                # Design tokens
│   │   ├── BriggsDefault.json
│   │   ├── BriggsDark.json
│   │   └── index.ts
│   ├── hooks/                 # Reusable hooks
│   ├── utils/                 # Utility functions
│   ├── assets/                # Static assets
│   ├── global.css             # Global styles
│   └── index.ts               # Main export
├── dist/                      # Built package
├── storybook-static/          # Built Storybook
├── rollup.config.cjs          # Package build config
├── vite.config.ts             # Vite config
├── tailwind.config.js         # Tailwind config
├── package.json               # Dependencies
└── Dockerfile                 # Container config
```

## 6. Integration Patterns

### Using in React Projects
```typescript
// Install and import
npm install @briggs-walker/briggsdesignsystem

// Import components
import { Button, Card, Table } from '@briggs-walker/briggsdesignsystem';

// Import styles
import '@briggs-walker/briggsdesignsystem/dist/briggs-design-system.css';
```

### Tailwind Integration
```javascript
// tailwind.config.js in consuming project
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@briggs-walker/briggsdesignsystem/**/*.{js,jsx,ts,tsx}'
  ],
  // ... rest of config
}
```

## 7. Development Workflow

### Component Development
1. Create component in `src/components/[ComponentName]/`
2. Add TypeScript interfaces
3. Create `.stories.tsx` file
4. Add to `src/index.ts` exports
5. Test in Storybook
6. Build and publish

### Theme Development
1. Update tokens in `src/tokens/`
2. Rebuild Tailwind config
3. Test in Storybook
4. Verify in consuming applications

### Release Process
1. Update version in `package.json`
2. Build package: `npm run build`
3. Build Storybook: `npm run build-storybook`
4. Test locally
5. Publish to NPM registry
6. Deploy Storybook to hosting
