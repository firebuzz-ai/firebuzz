# @firebuzz/design-mode

Design mode overlay and utilities for Firebuzz landing page templates. Enables visual editing of React components in development mode using React Fiber's `_debugSource`.

## Features

- **Visual Element Selection**: Click to select any element in your template
- **Runtime Element Tracking**: Uses React Fiber internals (no build-time modifications needed)
- **Client-side Tailwind Generation**: Generates CSS for Tailwind classes at runtime
- **Theme Customization**: Live preview of theme changes (colors, fonts, etc.)
- **Element Editing**: Edit className, text content, images, and links

## Installation

```bash
pnpm add @firebuzz/design-mode
```

## Usage

### 1. Add the Vite Plugin

In your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { firebuzzDesignMode } from "@firebuzz/design-mode";

export default defineConfig({
  plugins: [
    react(),
    firebuzzDesignMode(),
  ],
});
```

### 2. Create Design Mode Directory

The plugin expects a Tailwind config JSON to be generated at `./src/design-mode/tailwind.config.json`. The directory will be created automatically.

### 3. Enable Design Mode

Design mode is automatically enabled in development (`NODE_ENV=development`). To disable it, set:

```bash
VITE_DESIGN_MODE=false
```

## Configuration

The plugin accepts optional configuration:

```typescript
firebuzzDesignMode({
  // Path to your tailwind.config.js (default: "./tailwind.config.js")
  tailwindConfigPath: "./tailwind.config.js",

  // Output path for generated JSON (default: "./src/design-mode/tailwind.config.json")
  outputPath: "./src/design-mode/tailwind.config.json",

  // Custom overlay script path (default: uses package's overlay)
  overlayPath: "@firebuzz/design-mode/overlay",
})
```

## How It Works

1. **Vite Plugin**: Generates Tailwind config JSON at build time and injects the overlay script
2. **Overlay Script**: Listens for postMessage events from parent window and enables element selection
3. **Tailwind Generator**: Generates CSS for Tailwind classes at runtime as they're applied
4. **React Fiber Integration**: Tracks element source locations using React's internal `_debugSource` property

## Message Protocol

The overlay communicates with the parent window using postMessage:

### Messages to Overlay (from parent)

- `ENABLE_DESIGN_MODE`: Enable design mode overlay
- `DISABLE_DESIGN_MODE`: Disable design mode overlay
- `FB_SELECT_ELEMENT`: Programmatically select an element
- `FB_DESELECT_ELEMENT`: Deselect the current element
- `FB_UPDATE_ELEMENT`: Update element properties (className, textContent, etc.)
- `FB_UPDATE_THEME`: Update theme CSS variables
- `FB_GET_ALL_ELEMENTS_STATE`: Request current state of all elements

### Messages from Overlay (to parent)

- `FB_ELEMENT_SELECTED`: User selected an element (includes source location and properties)
- `FB_ALL_ELEMENTS_STATE`: Response with all elements' current state

## TypeScript

The package includes full TypeScript definitions:

```typescript
import type {
  DesignModeMessage,
  ElementSelectedMessage,
  ElementData,
} from "@firebuzz/design-mode";
```

## Development

This package is part of the Firebuzz monorepo and is designed to work with Vite-based React templates.

## License

MIT
