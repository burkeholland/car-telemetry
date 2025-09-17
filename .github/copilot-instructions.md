# Car Telemetry Simulator - AI Coding Instructions

## Project Overview
This is a **real-time car telemetry dashboard** built with Next.js 15 (App Router), React 19, and shadcn/ui components. The project simulates vehicle telemetry data and streams it via WebSocket for live visualization.

## Architecture & Key Patterns

### Design System Foundation
- **shadcn/ui + CVA**: All UI components use `class-variance-authority` for typed variants (see `components/ui/button.tsx`)
- **CSS Variables**: Design tokens in `app/globals.css` with semantic status colors (`--status-ok`, `--status-warn`, `--status-critical`)
- **Dark-first theming**: `ThemeProvider` wraps app with `next-themes`, defaulting to dark mode
- **cn() utility**: Always use `cn()` from `@/lib/utils` for className merging, never direct template literals

### Component Architecture Conventions
```tsx
// ✅ Correct shadcn/ui pattern (with forwardRef when needed)
const MyComponent = React.forwardRef<HTMLElement, Props>(
  ({ className, variant, ...props }, ref) => (
    <Element
      className={cn(baseClasses, variantClasses({ variant }), className)}
      ref={ref}
      {...props}
    />
  )
);

// ✅ Always destructure className and use cn()
export function CustomCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("base-styles", className)} {...props} />
  );
}
```

### Accessibility Requirements
- **Dialog components**: Must include `DialogPrimitive.Title` or wrap with `VisuallyHidden` (see recent dialog fix)
- **Semantic HTML**: Use proper heading hierarchy, ARIA labels for interactive elements
- **Status indicators**: Use semantic colors with text alternatives for screen readers

### File Structure Patterns
- `app/` - Next.js App Router pages and layouts
- `components/ui/` - shadcn/ui primitives (Button, Card, Dialog, etc.)
- `components/` - Custom components and providers
- `lib/` - Utilities and shared functions
- `types/` - TypeScript interfaces (planned: telemetry types)
- `docs/plan.md` - Comprehensive project roadmap and architecture decisions

### Development Workflow
- **Package manager**: Use `npm` (lockfile: package-lock.json)
- **Dev server**: `npm run dev` (Next.js on port 3000)
- **Linting**: `npm run lint` (ESLint with Next.js config)
- **No build step needed** for development - Next.js handles it

## Telemetry-Specific Patterns

### Data Model (From docs/plan.md)
```typescript
// Core interfaces to implement:
interface TelemetrySample {
  timestamp: number;
  vehicleId: string;
  speedKph: number;
  rpm: number;
  gear: number;
  throttlePct: number;
  // ... full schema in docs/plan.md Section 3
}
```

### Real-time Architecture (Planned)
- **WebSocket primary**: `/api/stream` route handler
- **State management**: Zustand store with ring buffer for live samples
- **Performance**: Frame-batched updates, LTTB downsampling for charts
- **Alert system**: Rule-based evaluation with hysteresis and debouncing

## Component Development Guidelines

### When Creating New Components
1. **Check existing**: Use `components/ui/` primitives before creating custom ones
2. **Follow shadcn pattern**: Export both component and variants (if using CVA)
3. **Accessibility first**: Include proper ARIA attributes and semantic structure
4. **Dark mode support**: Use CSS variables, test in both themes

### Styling Conventions
- **Semantic classes**: Use `bg-surface`, `text-foreground`, `border-border` instead of specific colors
- **Status colors**: `text-status-ok`, `text-status-warn`, `text-status-critical` for telemetry states
- **Layout utilities**: Leverage `space-y-*`, `gap-*`, `grid-cols-*` for consistent spacing
- **Responsive design**: Mobile-first approach, test sidebar collapse behavior

### Common Patterns in Codebase
```tsx
// ✅ Theme-aware styling
<div className="bg-background text-foreground border-border">

// ✅ Status indicators with semantic colors  
<Badge className="text-status-ok">Normal</Badge>

// ✅ Responsive grid layouts
<div className="grid sm:grid-cols-2 gap-6">

// ✅ Client components for interactivity
"use client";
```

## Integration Points

### External Dependencies
- **Radix UI**: Base primitives for shadcn/ui components
- **Lucide React**: Icon system (see X icon in dialog close)
- **next-themes**: Theme switching with system preference
- **Tailwind CSS v4**: Utility-first styling with inline theme configuration

### Future Integrations (Per Plan)
- **Zustand**: Client state management for telemetry streams
- **Visx/D3**: Charts and data visualization
- **SQLite/LibSQL**: Persistence layer for historical data
- **WebSocket API**: Real-time data transport

## Development Tips

### Common Tasks
- **Add new UI component**: `npx shadcn-ui@latest add [component]` then customize
- **Debug styling**: Check CSS variables in browser dev tools, verify dark/light mode
- **Test responsiveness**: Use browser dev tools device emulation, test sidebar behaviors
- **Performance**: Monitor re-renders with React DevTools, check memory usage during streams

### Error Prevention
- **Always use cn()** for className concatenation to prevent style conflicts
- **Include accessibility requirements** - especially DialogTitle for dialogs
- **Test theme switching** - verify components work in both light and dark modes
- **Validate TypeScript** - use strict typing for telemetry interfaces when implementing

---
*Keep this file updated as architecture evolves. Reference `docs/plan.md` for comprehensive implementation details.*