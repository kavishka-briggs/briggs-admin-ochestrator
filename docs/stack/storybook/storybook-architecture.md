# Storybook Design System Architecture Principles and Best Practices

This document provides architectural guidelines and best practices for developing and maintaining the Briggs Design System using Storybook as the primary documentation and development environment.

## Architecture Overview

### Design System Philosophy

The Briggs Design System follows a **component-driven development** approach with Storybook serving as both the development environment and living documentation platform. The system is built to ensure consistency, accessibility, and developer experience across all Briggs applications.

### Core Architectural Principles

1. **Atomic Design Methodology**: Components organized by complexity (atoms → molecules → organisms)
2. **Design Token Foundation**: All visual properties derived from centralized design tokens
3. **Accessibility First**: WCAG 2.1 AA compliance built into every component
4. **Framework Agnostic Distribution**: Components built for React but tokens available for other frameworks
5. **Living Documentation**: Storybook serves as both development tool and design documentation
6. **Progressive Enhancement**: Components work without JavaScript and enhance with it

## Project Structure and Organization

### Design System Architecture Pattern

```
briggsdesignsystem/
├── .storybook/                 # Storybook configuration
│   ├── main.ts                # Core Storybook configuration
│   ├── preview.ts             # Global decorators and parameters
│   ├── theme.js               # Custom Storybook theme
│   └── manager.js             # Manager UI customization
├── src/
│   ├── components/            # Component library (Atomic Design)
│   │   ├── atoms/            # Basic building blocks
│   │   │   ├── Button/
│   │   │   ├── Icon/
│   │   │   └── Text/
│   │   ├── molecules/        # Simple combinations
│   │   │   ├── Card/
│   │   │   ├── Dropdown/
│   │   │   └── TextInput/
│   │   ├── organisms/        # Complex combinations
│   │   │   ├── Table/
│   │   │   ├── Sidebar/
│   │   │   └── PageHeader/
│   │   └── templates/        # Layout components
│   │       ├── Modal/
│   │       └── SidePanel/
│   ├── tokens/               # Design tokens
│   │   ├── BriggsDefault.json
│   │   ├── BriggsDark.json
│   │   ├── index.ts
│   │   └── generators/       # Token processing utilities
│   ├── hooks/                # Reusable React hooks
│   │   ├── useClickOutside.ts
│   │   └── useTable.ts
│   ├── utils/                # Utility functions
│   │   ├── dateUtils.ts
│   │   ├── accessibility.ts
│   │   └── validation.ts
│   ├── assets/               # Static assets
│   │   ├── fonts/
│   │   ├── images/
│   │   └── icons/
│   ├── global.css            # Global styles and CSS reset
│   ├── global.d.ts           # Global type definitions
│   └── index.ts              # Main export file
├── dist/                     # Built package output
├── storybook-static/         # Built Storybook documentation
├── docs/                     # Additional documentation
├── tests/                    # Testing utilities and setup
├── rollup.config.cjs         # Package build configuration
├── vite.config.ts            # Development build configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.cjs        # PostCSS configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Package configuration and scripts
└── Dockerfile                # Container configuration for Storybook hosting
```

### Key Architectural Principles

1. **Component Isolation**: Each component is self-contained with its own styles, tests, and documentation
2. **Design Token Driven**: All styling decisions flow from centralized design tokens
3. **Story-Driven Development**: Components developed alongside their Storybook stories
4. **Type Safety**: Full TypeScript coverage for components, props, and utilities
5. **Build Optimization**: Separate builds for package distribution and Storybook hosting
6. **Theme Support**: Multiple theme variants supported through design token system

## Component Architecture

### Component Development Pattern

```typescript
// Component structure example: Button/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Variant definitions using class-variance-authority
const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary-500 text-white hover:bg-primary-600",
        destructive: "bg-error-500 text-white hover:bg-error-600",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary-100 text-secondary-900 hover:bg-secondary-200",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-500 underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// Component interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Component implementation
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;
```

### Story Architecture Pattern

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states.'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual style variant of the button'
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Size variant of the button'
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled'
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

// Core variants
export const Default: Story = {
  args: {
    children: 'Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary'
  }
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive'
  }
};

// Size variants
export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button'
  }
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button'
  }
};

// State variants
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button'
  }
};

// Interactive playground
export const Playground: Story = {
  args: {
    children: 'Playground Button'
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls below to experiment with different button configurations.'
      }
    }
  }
};
```

## Design Token Architecture

### Token Hierarchy and Organization

```typescript
// tokens/BriggsDefault.json
{
  "meta": {
    "name": "Briggs Default Theme",
    "version": "1.0.0",
    "description": "Default design tokens for the Briggs Design System"
  },
  "colors": {
    "primitive": {
      "gray": {
        "50": "#f9fafb",
        "100": "#f3f4f6",
        "500": "#6b7280",
        "900": "#111827"
      },
      "blue": {
        "50": "#eff6ff",
        "500": "#3b82f6",
        "900": "#1e3a8a"
      }
    },
    "semantic": {
      "primary": {
        "50": "{colors.primitive.blue.50}",
        "500": "{colors.primitive.blue.500}",
        "900": "{colors.primitive.blue.900}"
      },
      "neutral": {
        "50": "{colors.primitive.gray.50}",
        "500": "{colors.primitive.gray.500}",
        "900": "{colors.primitive.gray.900}"
      },
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "{colors.semantic.primary.500}"
    },
    "component": {
      "button": {
        "primary": {
          "background": "{colors.semantic.primary.500}",
          "hover": "{colors.semantic.primary.600}",
          "text": "{colors.primitive.gray.50}"
        }
      }
    }
  },
  "typography": {
    "fontFamily": {
      "sans": ["Inter", "system-ui", "sans-serif"],
      "serif": ["Georgia", "serif"],
      "mono": ["JetBrains Mono", "monospace"]
    },
    "fontSize": {
      "xs": ["0.75rem", { "lineHeight": "1rem" }],
      "sm": ["0.875rem", { "lineHeight": "1.25rem" }],
      "base": ["1rem", { "lineHeight": "1.5rem" }],
      "lg": ["1.125rem", { "lineHeight": "1.75rem" }],
      "xl": ["1.25rem", { "lineHeight": "1.75rem" }]
    },
    "fontWeight": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    }
  },
  "spacing": {
    "0": "0px",
    "1": "0.25rem",
    "2": "0.5rem",
    "4": "1rem",
    "8": "2rem",
    "16": "4rem"
  },
  "borderRadius": {
    "none": "0px",
    "sm": "0.125rem",
    "base": "0.25rem",
    "md": "0.375rem",
    "lg": "0.5rem",
    "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "base": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
  }
}
```

### Token Processing and Integration

```typescript
// tokens/index.ts
interface DesignTokens {
  colors: Record<string, any>;
  typography: Record<string, any>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
}

export const getTokens = (theme: string = 'BriggsDefault'): DesignTokens => {
  try {
    const tokens = require(`./${theme}.json`);
    return processTokens(tokens);
  } catch (error) {
    console.warn(`Theme ${theme} not found, falling back to BriggsDefault`);
    return processTokens(require('./BriggsDefault.json'));
  }
};

// Process token references (e.g., "{colors.primitive.blue.500}")
const processTokens = (tokens: any): DesignTokens => {
  const processValue = (value: any, context: any): any => {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      const path = value.slice(1, -1).split('.');
      return path.reduce((obj, key) => obj?.[key], context);
    }
    if (typeof value === 'object' && value !== null) {
      const processed: any = {};
      for (const [key, val] of Object.entries(value)) {
        processed[key] = processValue(val, tokens);
      }
      return processed;
    }
    return value;
  };

  return processValue(tokens, tokens);
};

// Generate CSS custom properties
export const generateCSSVariables = (tokens: DesignTokens): string => {
  const flatten = (obj: any, prefix = ''): Record<string, string> => {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}-${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flatten(value, newKey));
      } else {
        result[`--${newKey}`] = Array.isArray(value) ? value[0] : value;
      }
    }
    
    return result;
  };

  const variables = flatten(tokens);
  return Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
};
```

## Storybook Configuration Architecture

### Advanced Storybook Setup

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-webpack5';
import { dirname, join } from 'path';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('@storybook/addon-docs'),
    {
      name: getAbsolutePath('@storybook/addon-postcss'),
      options: {
        postcssLoaderOptions: {
          implementation: require('postcss')
        }
      }
    },
    getAbsolutePath('@chromatic-com/storybook')
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {}
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation'
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      }
    }
  },
  webpackFinal: async (config) => {
    // Add support for absolute imports
    config.resolve!.alias = {
      ...config.resolve!.alias,
      '@': join(__dirname, '..', 'src')
    };

    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all'
          }
        }
      }
    };

    return config;
  }
};

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}

export default config;
```

### Global Configuration and Theming

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { themes } from '@storybook/theming';
import '../src/global.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true
    },
    docs: {
      theme: themes.light,
      toc: {
        contentsSelector: '.sbdocs-content',
        headingSelector: 'h1, h2, h3',
        ignoreSelector: '#primary',
        title: 'Table of Contents',
        disable: false,
        unsafeTocbotOptions: {
          orderedList: false,
        },
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'gray',
          value: '#f5f5f5',
        }
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        }
      }
    }
  },
  globalTypes: {
    theme: {
      description: 'Design System Theme',
      defaultValue: 'BriggsDefault',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'BriggsDefault', title: 'Default Theme' },
          { value: 'BriggsDark', title: 'Dark Theme' }
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'BriggsDefault';
      
      return (
        <div 
          className={`briggs-theme-${theme.toLowerCase()}`}
          style={{ minHeight: '100vh', padding: '1rem' }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
```

## Build and Distribution Architecture

### Package Build Configuration

```typescript
// rollup.config.cjs
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const postcss = require('rollup-plugin-postcss');
const { terser } = require('rollup-plugin-terser');
const path = require('path');

const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@types/react',
  '@types/react-dom'
];

const plugins = [
  resolve({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    preferBuiltins: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: true,
    declarationDir: 'dist/types',
    exclude: ['**/*.stories.*', '**/*.test.*', '.storybook/**/*']
  }),
  postcss({
    extract: path.resolve('dist/briggs-design-system.css'),
    minimize: true,
    plugins: [
      require('autoprefixer'),
      require('tailwindcss')
    ]
  })
];

module.exports = [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    },
    external,
    plugins
  },
  // UMD build for CDN usage
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'BriggsDesignSystem',
      globals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
      },
      sourcemap: true
    },
    external,
    plugins: [...plugins, terser()]
  }
];
```

### Container Architecture for Storybook Hosting

```dockerfile
# Multi-stage Dockerfile for optimized Storybook hosting
FROM node:20.18.3-alpine3.21 AS builder

# Install system dependencies
RUN apk update && apk add --no-cache \
    git \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy source code
COPY . .

# Build Storybook
RUN npm run build-storybook

# Production stage
FROM nginx:alpine AS production

# Copy built Storybook
COPY --from=builder /app/storybook-static /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Development stage
FROM node:20.18.3-alpine3.21 AS development

RUN apk update && apk add xdg-utils --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 6006

CMD ["npm", "run", "storybook"]
```

## Testing and Quality Assurance

### Component Testing Strategy

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
```

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './Button.stories';

const { Default, Secondary, Disabled } = composeStories(stories);

describe('Button Component', () => {
  describe('Rendering', () => {
    test('renders with default props', () => {
      render(<Default />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('renders with custom content', () => {
      render(<Default>Custom Button</Default>);
      expect(screen.getByText('Custom Button')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    test('applies secondary variant styles', () => {
      render(<Secondary />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary-100');
    });
  });

  describe('Interactions', () => {
    test('handles click events', () => {
      const handleClick = jest.fn();
      render(<Default onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('disabled state prevents clicks', () => {
      const handleClick = jest.fn();
      render(<Disabled onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('is keyboard accessible', () => {
      render(<Default />);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
    });

    test('supports aria labels', () => {
      render(<Default aria-label="Custom button label" />);
      expect(screen.getByLabelText('Custom button label')).toBeInTheDocument();
    });
  });
});
```

## Documentation and Maintenance

### Component Documentation Standards

```mdx
<!-- Button.stories.mdx -->
import { Canvas, Meta, Story, ArgsTable } from '@storybook/addon-docs';
import Button from './Button';

<Meta
  title="Components/Atoms/Button"
  component={Button}
  argTypes={{
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
    }
  }}
/>

# Button

The Button component is a fundamental interactive element that triggers actions when activated.

## Design Principles

- **Clarity**: Button purpose should be immediately clear from its label and context
- **Consistency**: All buttons follow the same interaction patterns and visual hierarchy
- **Accessibility**: Full keyboard navigation and screen reader support
- **Feedback**: Clear visual and interaction feedback for all states

## Usage Guidelines

### When to Use
- Triggering actions (submit forms, open modals, navigate)
- Confirming or canceling operations
- Primary and secondary actions in interfaces

### When Not to Use
- Navigation to other pages (use links instead)
- Toggling states (use switches or checkboxes)
- Selecting from options (use radio buttons or dropdowns)

## Component API

<ArgsTable of={Button} />

## Examples

### Basic Usage

<Canvas>
  <Story name="Basic">
    <Button>Click me</Button>
  </Story>
</Canvas>

### Variants

<Canvas>
  <Story name="Variants">
    <div className="flex gap-4 flex-wrap">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  </Story>
</Canvas>

### Sizes

<Canvas>
  <Story name="Sizes">
    <div className="flex gap-4 items-center">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  </Story>
</Canvas>

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support with Tab and Enter/Space
- **Focus Management**: Clear focus indicators and logical tab order
- **Screen Reader Support**: Proper ARIA labels and role attributes
- **High Contrast**: Meets WCAG AA contrast requirements
- **Reduced Motion**: Respects user's motion preferences

## Implementation Notes

### Styling
- Built with Tailwind CSS utility classes
- Uses CSS custom properties for theme values
- Supports dark mode through design tokens

### Performance
- Minimal bundle impact (~2KB gzipped)
- No runtime dependencies beyond React
- Optimized for tree-shaking

### Browser Support
- All modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ with polyfills
- Mobile browsers (iOS Safari, Chrome Mobile)

## Related Components

- [Link](#) - For navigation between pages
- [IconButton](#) - For buttons with only icons
- [ButtonGroup](#) - For grouping related buttons
```

This comprehensive architecture document provides the foundation for maintaining and extending the Briggs Design System. It emphasizes consistency, accessibility, and developer experience while providing clear patterns for component development, documentation, and distribution.
