# @firebuzz/file-system-v2

A modern tar-based file system for working with template files in Convex actions.

## Installation

```bash
pnpm add @firebuzz/file-system-v2
```

## Features

- ✅ Load tar files from Buffer or URL
- ✅ Read, write, create, and delete files
- ✅ Create and delete directories
- ✅ Path existence and type checking
- ✅ List files and directories
- ✅ Export back to tar buffer
- ✅ Debug tree view
- ✅ Works in Node.js environments (Convex actions)

## Usage

### Loading

```typescript
import { TarFileSystem } from '@firebuzz/file-system-v2';

// Load from buffer
const tarFS = await TarFileSystem.fromTar(tarBuffer);

// Load from URL (R2 signed URL)
const tarFS = await TarFileSystem.fromUrl('https://r2.example.com/template.tar');
```

### File Operations

```typescript
// Read file
const content = tarFS.readFile('src/App.tsx');

// Write to file (create or update)
tarFS.writeFile('src/App.tsx', newContent);

// Create new file (throws if exists)
tarFS.createFile('src/NewComponent.tsx', componentCode);

// Replace text in file
tarFS.replaceInFile('src/App.tsx', 'TEMPLATE_NAME', 'My App');

// Delete file
tarFS.deleteFile('src/OldComponent.tsx');
```

### Directory Operations

```typescript
// Create directory
tarFS.createDirectory('src/components/new-section');

// Delete directory (recursive)
tarFS.deleteDirectory('src/components/old-section');

// List files in directory
const files = tarFS.listDirectory('src'); // ['App.tsx', 'main.ts', ...]

// List all files (full paths)
const allFiles = tarFS.listFiles(); // ['src/App.tsx', 'src/main.ts', ...]
```

### Checks

```typescript
// Check if path exists
if (tarFS.exists('src/config.ts')) {
  tarFS.writeFile('src/config.ts', newConfig);
}

// Check if file
if (tarFS.isFile('src/App.tsx')) {
  const content = tarFS.readFile('src/App.tsx');
}

// Check if directory
if (tarFS.isDirectory('src/components')) {
  const files = tarFS.listDirectory('src/components');
}
```

### Export

```typescript
// Export to tar buffer
const modifiedTar = await tarFS.toTar();

// Upload to R2
await r2.put(key, modifiedTar);
```

### Debugging

```typescript
// Get tree structure
const tree = tarFS.getTree();
console.log(JSON.stringify(tree, null, 2));

/*
{
  "name": "/",
  "type": "directory",
  "children": [
    {
      "name": "src",
      "type": "directory",
      "children": [
        {
          "name": "App.tsx",
          "type": "file",
          "size": 1234
        }
      ]
    }
  ]
}
*/
```

## Example: Template Customization in Convex Action

```typescript
"use node";
import { TarFileSystem } from '@firebuzz/file-system-v2';
import { internalAction } from './_generated/server';

export const customizeTemplate = internalAction({
  handler: async (ctx, { templateId, brand, theme }) => {
    // 1. Load base template
    const baseTarUrl = await getBaseTemplateTarUrl(templateId);
    const tarFS = await TarFileSystem.fromUrl(baseTarUrl);

    // 2. Customize SEO
    const seoConfig = buildSeoConfig(brand);
    tarFS.writeFile('src/configuration/seo.ts',
      `export const seoConfiguration = ${JSON.stringify(seoConfig, null, 2)};`
    );

    // 3. Customize theme
    const themeCSS = buildThemeCSS(theme);
    tarFS.writeFile('src/styles/theme.css', themeCSS);

    // 4. Export modified tar
    const modifiedTar = await tarFS.toTar();

    // 5. Upload to R2
    const key = `templates/${uuid()}.tar`;
    await r2.put(key, modifiedTar);

    return key;
  }
});
```

## API Reference

### Static Methods

- `static async fromTar(buffer: Buffer): Promise<TarFileSystem>`
- `static async fromUrl(url: string): Promise<TarFileSystem>`

### File Operations

- `readFile(path: string): string`
- `writeFile(path: string, content: string): void`
- `createFile(path: string, content: string): void`
- `replaceInFile(path: string, search: string, replace: string): void`
- `deleteFile(path: string): void`

### Directory Operations

- `createDirectory(path: string): void`
- `deleteDirectory(path: string): void`

### Checks

- `exists(path: string): boolean`
- `isFile(path: string): boolean`
- `isDirectory(path: string): boolean`

### Listing

- `listFiles(): string[]`
- `listDirectory(path: string): string[]`

### Export

- `async toTar(): Promise<Buffer>`

### Debug

- `getTree(): FileTreeNode`

## Notes

- Paths can have leading/trailing slashes or not - they are normalized
- Parent directories are created automatically when creating files
- `writeFile` creates or updates files
- `createFile` throws if file already exists
- `deleteDirectory` is recursive
- All text files use UTF-8 encoding
