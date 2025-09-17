# Car Telemetry Simulator

A real-time car telemetry dashboard built with Next.js 15, React 19, and shadcn/ui components. Simulates vehicle telemetry data and streams it via WebSocket for live visualization.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Simulation Engine

The project includes a deterministic telemetry simulation engine that generates realistic car data.

### Preview Simulation

To see the simulation engine in action:

```bash
npm run sim:preview
```

This runs a short burst of telemetry generation and displays sample output. You can customize with:

```bash
npm run sim:preview -- --seed=42 --samples=20
```

### Engine Features

- **Deterministic**: Same seed produces repeatable results
- **Realistic Physics**: Approximated gear shifts, temperature dynamics, battery drain
- **Anomaly Injection**: Occasional spikes for alert system testing
- **Configurable**: Tick rate, vehicle specs, and behavior parameters

The engine emits `TelemetrySample` events containing:
- Vehicle dynamics (speed, RPM, gear, throttle, brake, steering)
- Engine temps (coolant, oil)
- Battery metrics (voltage, state of charge)
- Tire temperatures (FL, FR, RL, RR)
- Position data (lat/lng, lap, sector)

## Real-Time Streaming API

### Server-Sent Events (Recommended)

Connect to the SSE endpoint for real-time telemetry:

```javascript
const eventSource = new EventSource('/api/stream-sse');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'connected') {
    console.log('Connected:', message.clientId);
  } else if (message.type === 'telemetry') {
    const sample = message.data;
    console.log(`Speed: ${sample.speedKph}km/h, RPM: ${sample.rpm}`);
  }
};
```

### WebSocket Alternative

The `/api/stream` endpoint also supports SSE clients:

```javascript
fetch('/api/stream', {
  headers: { 'Accept': 'text/event-stream' }
}).then(response => {
  const reader = response.body.getReader();
  // Handle streaming data...
});
```

### Test Streaming

Verify endpoints are working:

```bash
npm run stream:test
npm run stream:test -- --samples=20 --timeout=30000
```

### Message Types

- `connected`: Initial connection confirmation with client ID and metrics
- `telemetry`: Real-time vehicle data samples  
- `heartbeat`: Keep-alive messages (every 30s)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
