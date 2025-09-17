/**
 * WebSocket Stream Route Handler (Step 4)
 * =======================================
 * Real-time telemetry streaming via WebSocket connection.
 * Connects to the simulation engine and broadcasts TelemetrySample events to all connected clients.
 * 
 * Features:
 * - Auto-starts simulation when first client connects
 * - Broadcasts to all connected clients simultaneously  
 * - Clean disconnection handling
 * - Basic connection metrics for observability
 */

import { NextRequest } from 'next/server';
import getSimulationEngine from '@/lib/simulation/engine';
import type { TelemetrySample } from '@/types/telemetry';

// Connection management (using ReadableStreamDefaultController for SSE)
const connections = new Set<ReadableStreamDefaultController>();
let simulationStarted = false;

// Basic metrics
let messagesSent = 0;
let connectionsTotal = 0;

export async function GET(request: NextRequest) {
  // For Next.js compatibility, we'll implement Server-Sent Events here
  // and create a separate WebSocket implementation using a different approach
  
  const clientId = `client-${++connectionsTotal}`;
  console.log(`SSE client connected: ${clientId}`);
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this connection
      connections.add(controller);
      
      // Start simulation when first client connects
      if (!simulationStarted && connections.size === 1) {
        startTelemetryBroadcast();
        simulationStarted = true;
      }
      
      // Send connection confirmation
      const connectMsg = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        clientId,
        metrics: {
          activeConnections: connections.size,
          messagesSent,
          connectionsTotal,
        }
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(connectMsg));
    },
    
    cancel() {
      // Handle client disconnect
      connections.forEach(conn => {
        if (conn === this) {
          connections.delete(conn);
        }
      });
      
      console.log(`SSE client disconnected: ${clientId}. Active: ${connections.size}`);
      
      // Stop simulation when no clients remain
      if (connections.size === 0) {
        stopTelemetryBroadcast();
        simulationStarted = false;
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Simulation broadcasting
function startTelemetryBroadcast() {
  const engine = getSimulationEngine({ 
    seed: Date.now(), // Different seed each session
    minTickMs: 100,
    maxTickMs: 200,
  });
  
  engine.on('sample', broadcastSample);
  engine.start();
  console.log('Telemetry broadcast started');
}

function stopTelemetryBroadcast() {
  const engine = getSimulationEngine();
  engine.stop();
  engine.off('sample', broadcastSample);
  console.log('Telemetry broadcast stopped');
}

function broadcastSample(sample: TelemetrySample) {
  const sseMessage = `data: ${JSON.stringify({
    type: 'telemetry',
    data: sample,
  })}\n\n`;
  
  // Broadcast to all connected SSE clients
  const disconnectedControllers: ReadableStreamDefaultController[] = [];
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(sseMessage));
      messagesSent++;
    } catch (error) {
      console.error('Failed to send to SSE client:', error);
      disconnectedControllers.push(controller);
    }
  });
  
  // Clean up dead connections
  disconnectedControllers.forEach(controller => connections.delete(controller));
}

// Handle optional client control messages (SSE doesn't support client->server messages)
// This function is kept for compatibility but won't be used in SSE mode
function handleClientMessage(controller: ReadableStreamDefaultController, message: unknown) {
  if (typeof message !== 'object' || !message || !('type' in message)) {
    return;
  }
  
  // SSE is unidirectional, so we can't respond to client messages
  // For bidirectional communication, use WebSocket implementation
  console.log('SSE received message (cannot respond):', message);
}

// Export named functions for testing
export { connections, broadcastSample, handleClientMessage };