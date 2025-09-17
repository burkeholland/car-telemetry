/**
 * Server-Sent Events (SSE) Fallback Route (Step 4)
 * ================================================
 * Dedicated SSE endpoint for clients that can't use WebSocket.
 * Identical functionality to /api/stream but explicitly SSE-only.
 * 
 * Usage: EventSource('/api/stream-sse') in the browser
 */

import { NextRequest } from 'next/server';
import getSimulationEngine from '@/lib/simulation/engine';
import type { TelemetrySample } from '@/types/telemetry';

// Track heartbeat intervals per controller without mutating controller objects
const heartbeatIntervals = new WeakMap<ReadableStreamDefaultController, NodeJS.Timeout>();

// Connection management for SSE clients
const sseConnections = new Set<ReadableStreamDefaultController>();
let simulationStarted = false;

// Basic metrics
let messagesSent = 0;
let connectionsTotal = 0;

export async function GET(request: NextRequest) {
  const clientId = `sse-client-${++connectionsTotal}`;
  console.log(`SSE client connected: ${clientId}`);
  
  // Create readable stream for Server-Sent Events
  let currentController: ReadableStreamDefaultController;
  let heartbeatInterval: NodeJS.Timeout;
  
  const stream = new ReadableStream({
    start(controller) {
      currentController = controller;
      
      // Store controller for broadcasting
      sseConnections.add(controller);
      
      // Start simulation when first client connects
      if (!simulationStarted && sseConnections.size === 1) {
        startSSETelemetryBroadcast();
        simulationStarted = true;
      }
      
      // Send initial connection message
      sendSSEMessage(controller, {
        type: 'connected',
        timestamp: Date.now(),
        clientId,
        metrics: {
          activeConnections: sseConnections.size,
          messagesSent,
          connectionsTotal,
        }
      });
      
      // Send periodic heartbeat
      heartbeatInterval = setInterval(() => {
        try {
          sendSSEMessage(controller, {
            type: 'heartbeat',
            timestamp: Date.now(),
            serverTime: new Date().toISOString(),
          });
        } catch (error) {
          clearInterval(heartbeatInterval);
          sseConnections.delete(controller);
        }
      }, 30000); // Every 30 seconds
      heartbeatIntervals.set(controller, heartbeatInterval);
    },
    
    cancel() {
      // Clean up on client disconnect
      sseConnections.delete(currentController);
      
      const interval = heartbeatIntervals.get(currentController);
      if (interval) clearInterval(interval);
      heartbeatIntervals.delete(currentController);
      
      console.log(`SSE client disconnected: ${clientId}. Active: ${sseConnections.size}`);
      
      // Stop simulation when no clients remain
      if (sseConnections.size === 0) {
        stopSSETelemetryBroadcast();
        simulationStarted = false;
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable proxy buffering
    },
  });
}

// Simulation management for SSE
function startSSETelemetryBroadcast() {
  const engine = getSimulationEngine({ 
    seed: Date.now(), 
    minTickMs: 150,
    maxTickMs: 250,
  });
  
  engine.on('sample', broadcastSSESample);
  engine.start();
  console.log('SSE telemetry broadcast started');
}

function stopSSETelemetryBroadcast() {
  const engine = getSimulationEngine();
  engine.stop();
  engine.off('sample', broadcastSSESample);
  console.log('SSE telemetry broadcast stopped');
}

function broadcastSSESample(sample: TelemetrySample) {
  const message = {
    type: 'telemetry',
    data: sample,
    timestamp: Date.now(),
  };
  
  // Send to all SSE connections
  const disconnectedControllers: ReadableStreamDefaultController[] = [];
  
  sseConnections.forEach((controller) => {
    try {
      sendSSEMessage(controller, message);
      messagesSent++;
    } catch (error) {
      console.error('Failed to send SSE message:', error);
      disconnectedControllers.push(controller);
    }
  });
  
  // Clean up failed connections
  disconnectedControllers.forEach(controller => {
    sseConnections.delete(controller);
    const interval = heartbeatIntervals.get(controller);
    if (interval) clearInterval(interval);
    heartbeatIntervals.delete(controller);
  });
}

// Helper to send formatted SSE messages
function sendSSEMessage(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  const sseData = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(sseData));
}

// Export for testing
export { sseConnections, broadcastSSESample, sendSSEMessage };