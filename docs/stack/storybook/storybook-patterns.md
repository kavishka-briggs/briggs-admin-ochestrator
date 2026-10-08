# Storybook Stack - Common Patterns

**CANONICAL SOURCE**: Storybook-specific code patterns and integration examples.

## Component Development Patterns

### Component Structure Pattern
```typescript
// Component.tsx
import React from 'react';

interface ComponentProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Component: React.FC<ComponentProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Component;
```

### Story Pattern
```typescript
// Component.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Component from './Component';

const meta: Meta<typeof Component> = {
  title: 'Components/Component',
  component: Component,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile component with multiple variants and sizes.'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline'],
      description: 'The visual style variant'
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'The size of the component'
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the component is disabled'
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: 'Default Component',
    variant: 'primary',
    size: 'md'
  }
};

// Variant stories
export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary'
  }
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary'
  }
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline'
  }
};

// Size stories
export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm'
  }
};

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg'
  }
};

// State stories
export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true
  }
};

// Interactive story with controls
export const Interactive: Story = {
  args: {
    children: 'Interactive Component'
  },
  render: (args) => (
    <div className="space-y-4">
      <Component {...args} />
      <p className="text-sm text-gray-600">
        Use the controls below to customize this component
      </p>
    </div>
  )
};
```

## Design Token Patterns

### Token Definition Pattern
```typescript
// tokens/BriggsDefault.json
{
  "colors": {
    "primary": {
      "50": "#eff6ff",
      "100": "#dbeafe",
      "500": "#3b82f6",
      "900": "#1e3a8a"
    },
    "semantic": {
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    }
  },
  "typography": {
    "fontFamily": {
      "typeface": ["Inter", "system-ui", "sans-serif"],
      "body": ["Open Sans", "system-ui", "sans-serif"]
    },
    "fontSize": {
      "xs": ["0.75rem", { "lineHeight": "1rem" }],
      "sm": ["0.875rem", { "lineHeight": "1.25rem" }],
      "base": ["1rem", { "lineHeight": "1.5rem" }],
      "lg": ["1.125rem", { "lineHeight": "1.75rem" }]
    }
  },
  "spacing": {
    "xs": "0.25rem",
    "sm": "0.5rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem"
  }
}
```

### Token Integration Pattern
```typescript
// tokens/index.ts
export const getTokens = (theme: string = 'BriggsDefault') => {
  try {
    return require(`./${theme}.json`);
  } catch (error) {
    console.warn(`Theme ${theme} not found, falling back to BriggsDefault`);
    return require('./BriggsDefault.json');
  }
};

// Usage in Tailwind config
const { getTokens } = require('./src/tokens');
const theme = process.env.THEME || 'BriggsDefault';
const tokens = getTokens(theme);

module.exports = {
  theme: {
    extend: {
      colors: tokens.colors,
      fontSize: tokens.typography.fontSize,
      fontFamily: tokens.typography.fontFamily
    }
  }
};
```

## Complex Component Patterns

### Compound Component Pattern
```typescript
// Table/Table.tsx
import React from 'react';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import TableRow from './TableRow';
import TableCell from './TableCell';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

const Table: React.FC<TableProps> & {
  Header: typeof TableHeader;
  Body: typeof TableBody;
  Row: typeof TableRow;
  Cell: typeof TableCell;
} = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        {children}
      </table>
    </div>
  );
};

// Attach sub-components
Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;

export default Table;
```

### Hook Pattern for Complex Components
```typescript
// hooks/useTable.ts
import { useState, useMemo } from 'react';

interface TableColumn<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
}

interface UseTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  pageSize?: number;
}

export const useTable = <T extends Record<string, any>>({
  data,
  columns,
  pageSize = 10
}: UseTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return {
    data: paginatedData,
    currentPage,
    totalPages,
    sortField,
    sortDirection,
    setCurrentPage,
    handleSort
  };
};
```

## Storybook Configuration Patterns

### Advanced Story Configuration
```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)', '../src/**/*.mdx'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-docs',
    '@storybook/addon-interactions',
    '@storybook/addon-postcss',
    '@chromatic-com/storybook'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  docs: {
    autodocs: true
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  }
};

export default config;
```

### Global Decorators and Parameters
```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/global.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      theme: {
        brandTitle: 'Briggs Design System',
        brandUrl: 'https://briggs-design-system.com',
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#333333' },
        { name: 'gray', value: '#f5f5f5' }
      ]
    }
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
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
        dynamicTitle: true
      }
    }
  }
};

export default preview;
```

## Documentation Patterns

### Component Documentation with MDX
```mdx
<!-- Button.stories.mdx -->
import { Canvas, Meta, Story, ArgsTable } from '@storybook/addon-docs';
import Button from './Button';

<Meta
  title="Components/Button"
  component={Button}
  argTypes={{
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline']
    }
  }}
/>

# Button

The Button component is a fundamental UI element used for user interactions.

## Usage

```tsx
import { Button } from '@briggs-walker/briggsdesignsystem';

function App() {
  return (
    <Button variant="primary" onClick={() => console.log('clicked')}>
      Click me
    </Button>
  );
}
```

## Variants

<Canvas>
  <Story name="Primary">
    <Button variant="primary">Primary Button</Button>
  </Story>
  <Story name="Secondary">
    <Button variant="secondary">Secondary Button</Button>
  </Story>
  <Story name="Outline">
    <Button variant="outline">Outline Button</Button>
  </Story>
</Canvas>

## Props

<ArgsTable of={Button} />

## Accessibility

- Supports keyboard navigation
- ARIA attributes included
- Focus management
- Screen reader compatible
```

## Testing Patterns

### Component Testing with Storybook
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';
import * as stories from './Button.stories';

const { Default, Primary, Disabled } = composeStories(stories);

describe('Button Component', () => {
  test('renders default button', () => {
    render(<Default />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Primary onClick={handleClick} />);
    
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
```

## Build and Export Patterns

### Package Export Strategy
```typescript
// src/index.ts - Barrel exports pattern
// Components
export { default as Button } from './components/Button/Button';
export { default as Card } from './components/Card/Card';
export { default as Table } from './components/Table/Table';

// Hooks
export { useTable } from './hooks/useTable';
export { useClickOutside } from './hooks/useClickOutside';

// Types
export type { ButtonProps } from './components/Button/Button';
export type { CardProps } from './components/Card/Card';
export type { TableProps } from './components/Table/Table';

// Utilities
export { formatDate } from './utils/dateUtils';

// Tokens (optional export for advanced usage)
export { getTokens } from './tokens';
```

### Build Configuration Pattern
```typescript
// rollup.config.cjs
module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    resolve({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
    typescript({ declaration: true, declarationDir: 'dist/types' }),
    postcss({ extract: 'dist/briggs-design-system.css' }),
    babel({ babelHelpers: 'runtime' })
  ],
  external: ['react', 'react-dom']
};
```
