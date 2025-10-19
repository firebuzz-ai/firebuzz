# Design Mode Test Harness

A simple Vite app to test the Firebuzz Design Mode functionality in isolation.

## Setup

1. **Start the clean template** (in one terminal):
   ```bash
   cd ../clean
   pnpm install
   pnpm dev
   ```
   This will run on `http://localhost:5173`

2. **Start the test harness** (in another terminal):
   ```bash
   cd ../design-mode-test
   pnpm install
   pnpm dev
   ```
   This will run on `http://localhost:5174` (or next available port)

## Usage

1. Open the test harness in your browser (usually `http://localhost:5174`)
2. You'll see:
   - **Left panel**: Element editor and debug console
   - **Right panel**: Preview iframe showing the clean template

3. Click "Enable Design Mode" to activate design mode in the iframe

4. Click on any element in the preview to select it

5. Edit the classes or text content in the editor panel

6. Watch the debug console for all postMessage communication

## Features

- ✅ Toggle design mode on/off
- ✅ Select elements by clicking
- ✅ Edit classes with real-time updates
- ✅ Edit text content with real-time updates
- ✅ Debug console showing all messages
- ✅ Full postMessage communication visibility

## Debugging

The debug console shows:
- When design mode is enabled/disabled
- When elements are selected (with full data)
- When updates are sent to the iframe
- Timestamps for all events

Check the browser console for additional logs from the overlay script.

## Notes

- The iframe URL is hardcoded to `http://localhost:5173` - make sure the clean template is running on this port
- If you see CORS errors, make sure both servers are running
- The test harness mimics the real app's design mode provider behavior
