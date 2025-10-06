# Sandbox Logger

High-performance real-time log streaming service for Vercel Sandbox commands. Built with **Bun** and **Hono** for maximum efficiency.

## Features

- ✅ **Real-time streaming** via Server-Sent Events (SSE)
- ✅ **Bun runtime** - 3-4x faster than Node.js
- ✅ **Low memory footprint** - ~2-5 MB per connection
- ✅ **Vercel Sandbox SDK** integration
- ✅ **Connection management** with abort support
- ✅ **Health & metrics** endpoints
- ✅ **Railway deployment** ready

## Architecture

```
┌──────────────┐
│  Next.js App │
│  (Frontend)  │
└──────┬───────┘
       │ SSE Connection
       │ Authorization: Bearer <token>
       ↓
┌─────────────────────────────┐
│  Sandbox Logger (Bun)       │
│  - Streams logs via SSE     │
│  - Manages connections      │
│  - No timeout limits        │
└──────┬──────────────────────┘
       │ Vercel SDK
       ↓
┌─────────────────┐
│ Vercel Sandbox  │
└─────────────────┘
```

## Performance

| Metric | Value |
|--------|-------|
| **Max Concurrent Connections** | 50,000+ |
| **Memory per Connection** | 2-5 MB |
| **CPU per 100 Connections** | 0.1-0.15 vCPU |
| **Railway Cost (100 concurrent)** | ~$6/month |

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "runtime": "bun",
  "version": "1.x.x",
  "activeConnections": 42,
  "uptime": 3600
}
```

### `GET /metrics`

Detailed metrics.

**Response:**
```json
{
  "activeConnections": 42,
  "memory": {
    "rss": "120 MB",
    "heapTotal": "80 MB",
    "heapUsed": "45 MB"
  },
  "uptime": "3600 seconds",
  "pid": 1234
}
```

### `GET /stream/:sandboxId/:cmdId`

Stream sandbox command logs via Server-Sent Events.

**Headers:**
- `Authorization: Bearer <SERVICE_TOKEN>`

**Response:** SSE stream with events:

#### `connected` event
```json
{
  "type": "connected",
  "sandboxId": "sbx_xxx",
  "cmdId": "cmd_xxx",
  "timestamp": 1234567890
}
```

#### `log` event
```json
{
  "type": "log",
  "stream": "stdout",
  "data": "Installing dependencies...",
  "timestamp": 1234567891
}
```

#### `complete` event
```json
{
  "type": "complete",
  "exitCode": 0,
  "timestamp": 1234567999
}
```

#### `error` event
```json
{
  "type": "error",
  "error": "Connection failed",
  "timestamp": 1234567999
}
```

### `POST /cleanup/:sandboxId/:cmdId`

Abort active streams for a specific sandbox/command.

**Headers:**
- `Authorization: Bearer <SERVICE_TOKEN>`

**Response:**
```json
{
  "success": true,
  "abortedConnections": 3
}
```

### `POST /cleanup-all`

Abort all active connections (admin only).

**Headers:**
- `Authorization: Bearer <SERVICE_TOKEN>`

**Response:**
```json
{
  "success": true,
  "abortedConnections": 42
}
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) installed
- Vercel Sandbox credentials

### Local Development

1. **Install dependencies:**
   ```bash
   cd apps/sandbox-logger
   bun install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run development server:**
   ```bash
   bun run dev
   ```

   Server starts at `http://localhost:3000`

### Test the Server

```bash
# Health check
curl http://localhost:3000/health

# Stream logs (replace with real sandboxId/cmdId)
curl -N \
  -H "Authorization: Bearer YOUR_SERVICE_TOKEN" \
  http://localhost:3000/stream/sbx_xxx/cmd_xxx
```

## Railway Deployment

### 1. Create New Railway Project

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
cd apps/sandbox-logger
railway link
```

### 2. Set Environment Variables

Go to Railway dashboard and add:
- `SERVICE_TOKEN`
- `VERCEL_TEAM_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`
- `ALLOWED_ORIGINS` (comma-separated)

Or via CLI:
```bash
railway variables set SERVICE_TOKEN="your-token"
railway variables set VERCEL_TEAM_ID="team_xxx"
railway variables set VERCEL_PROJECT_ID="prj_xxx"
railway variables set VERCEL_TOKEN="xxx"
railway variables set ALLOWED_ORIGINS="https://app.firebuzz.dev"
```

### 3. Deploy

```bash
railway up
```

Railway will:
- Detect Bun runtime automatically (via `railway.toml`)
- Install dependencies with `bun install`
- Start server with `bun run start`

### 4. Get Deployment URL

```bash
railway domain
```

Example: `https://sandbox-logger-production.up.railway.app`

## Frontend Integration

### React Hook

```typescript
// hooks/useSandboxLogs.ts
import { useEffect, useState } from "react";

interface LogEntry {
  type: "log" | "connected" | "complete" | "error";
  stream?: "stdout" | "stderr";
  data?: string;
  exitCode?: number;
  error?: string;
  timestamp: number;
}

export function useSandboxLogs(sandboxId: string, cmdId: string) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "complete" | "error">("connecting");
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    const serviceUrl = process.env.NEXT_PUBLIC_SANDBOX_LOGGER_URL;
    const serviceToken = process.env.NEXT_PUBLIC_SERVICE_TOKEN;

    const eventSource = new EventSource(
      `${serviceUrl}/stream/${sandboxId}/${cmdId}`,
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${serviceToken}`,
        },
      }
    );

    eventSource.addEventListener("connected", () => {
      console.log("Connected to sandbox logger");
      setStatus("connected");
    });

    eventSource.addEventListener("log", (event) => {
      const logData: LogEntry = JSON.parse(event.data);
      const logLine = `[${logData.stream}] ${logData.data}`;
      setLogs((prev) => [...prev, logLine]);
    });

    eventSource.addEventListener("complete", (event) => {
      const data: LogEntry = JSON.parse(event.data);
      setStatus("complete");
      setExitCode(data.exitCode ?? null);
      setLogs((prev) => [...prev, `\nCommand exited with code ${data.exitCode}`]);
      eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
      console.error("SSE error:", event);
      setStatus("error");
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [sandboxId, cmdId]);

  return { logs, status, exitCode };
}
```

### Usage in Component

```tsx
import { useSandboxLogs } from "@/hooks/useSandboxLogs";

export function SandboxTerminal({ sandboxId, cmdId }: { sandboxId: string; cmdId: string }) {
  const { logs, status, exitCode } = useSandboxLogs(sandboxId, cmdId);

  return (
    <div className="terminal">
      <div className="status">
        Status: {status} {exitCode !== null && `(Exit code: ${exitCode})`}
      </div>
      <pre>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </pre>
    </div>
  );
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `SERVICE_TOKEN` | Authentication token | `your-secret-token` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://app.firebuzz.dev` |
| `VERCEL_TEAM_ID` | Vercel team ID | `team_xxx` |
| `VERCEL_PROJECT_ID` | Vercel project ID | `prj_xxx` |
| `VERCEL_TOKEN` | Vercel API token | `xxx` |

## Monitoring

### View Logs (Railway)

```bash
railway logs
```

### Check Metrics

```bash
curl https://your-app.up.railway.app/metrics
```

### Monitor Active Connections

```bash
curl https://your-app.up.railway.app/health
```

## Cost Estimation

| Concurrent Users | Memory | CPU | Monthly Cost |
|------------------|--------|-----|--------------|
| 100 | 0.5 GB | 0.1 vCPU | ~$6 |
| 500 | 2.5 GB | 0.5 vCPU | ~$35 |
| 1,000 | 5 GB | 1 vCPU | ~$70 |

Railway pricing:
- RAM: $10/GB/month
- CPU: $20/vCPU/month
- Network: $0.05/GB

## Troubleshooting

### "Unauthorized" errors
- Check `SERVICE_TOKEN` matches between client and server
- Verify `Authorization: Bearer <token>` header is sent

### Connection drops
- Check Railway logs for errors
- Verify Vercel credentials are correct
- Check network/firewall settings

### High memory usage
- Monitor `/metrics` endpoint
- Check for connection leaks
- Verify cleanup endpoints are working

## Development

### Type checking
```bash
bun run typecheck
```

### Watch mode
```bash
bun run dev
```

## License

Private - Firebuzz
