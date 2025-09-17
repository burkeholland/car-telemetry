#!/usr/bin/env tsx
/**
 * Stream Test Client (Step 4 Verification)
 * ========================================
 * Tests the streaming endpoints to verify telemetry data flow.
 * Connects to both SSE and simulated WebSocket endpoints.
 * 
 * Usage:
 *   npm run stream:test
 *   npm run stream:test -- --endpoint=sse --samples=20
 */

interface CliArgs {
  endpoint: 'sse' | 'ws' | 'both';
  samples: number;
  timeout: number;
  host: string;
}

function parseArgs(): CliArgs {
  const endpointArg = process.argv.find(a => a.startsWith('--endpoint='));
  const samplesArg = process.argv.find(a => a.startsWith('--samples='));
  const timeoutArg = process.argv.find(a => a.startsWith('--timeout='));
  const hostArg = process.argv.find(a => a.startsWith('--host='));
  
  return {
    endpoint: (endpointArg?.split('=')[1] as CliArgs['endpoint']) || 'sse',
    samples: samplesArg ? Number(samplesArg.split('=')[1]) : 10,
    timeout: timeoutArg ? Number(timeoutArg.split('=')[1]) : 15000,
    host: hostArg?.split('=')[1] || 'http://localhost:3000',
  };
}

const args = parseArgs();
console.log(`Stream test starting: ${args.endpoint} endpoint, ${args.samples} samples, ${args.timeout}ms timeout`);

// Test SSE Connection
async function testSSE(host: string, samples: number, timeout: number) {
  console.log('\\n=== Testing SSE Endpoint ===');
  
  return new Promise<void>((resolve, reject) => {
    let receivedSamples = 0;
    let connectReceived = false;
    const startTime = Date.now();
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`SSE test timed out after ${timeout}ms. Received ${receivedSamples}/${samples} samples.`));
    }, timeout);
    
    try {
      // Use fetch with ReadableStream to simulate EventSource (Node.js compatible)
      fetch(`${host}/api/stream-sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      }).then(response => {
        if (!response.body) {
          throw new Error('No response body');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              clearTimeout(timeoutId);
              resolve();
              return Promise.resolve();
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\\n');
            
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.type === 'connected') {
                    console.log(`✓ SSE Connected: ${data.clientId}`);
                    console.log(`  Active connections: ${data.metrics.activeConnections}`);
                    connectReceived = true;
                  } else if (data.type === 'telemetry') {
                    receivedSamples++;
                    const sample = data.data;
                    console.log(`  Sample ${receivedSamples}: spd=${sample.speedKph.toFixed(1)}km/h rpm=${sample.rpm} gear=${sample.gear} soc=${sample.stateOfCharge.toFixed(1)}%`);
                    
                    if (receivedSamples >= samples) {
                      clearTimeout(timeoutId);
                      reader.cancel();
                      const elapsed = Date.now() - startTime;
                      console.log(`✓ SSE test completed: ${receivedSamples} samples in ${elapsed}ms`);
                      resolve();
                    }
                  } else if (data.type === 'heartbeat') {
                    console.log('  ♥ Heartbeat received');
                  }
                } catch (error) {
                  console.error('  Parse error:', error);
                }
              }
            });
            
            return readStream();
          });
        }
        
        return readStream();
      }).catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
      
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Test WebSocket Connection (will test the SSE endpoint since WS upgrade isn't implemented)
async function testWebSocket(host: string, samples: number, timeout: number) {
  console.log('\\n=== Testing WebSocket Endpoint (falls back to SSE) ===');
  
  // Since WebSocket upgrade isn't implemented, we'll test the /api/stream endpoint as SSE
  const wsHost = host.replace('http://', '').replace('https://', '');
  
  return new Promise<void>((resolve, reject) => {
    let receivedSamples = 0;
    const startTime = Date.now();
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`WebSocket test timed out after ${timeout}ms. Received ${receivedSamples}/${samples} samples.`));
    }, timeout);
    
    try {
      // Test the /api/stream endpoint as SSE for now
      fetch(`${host}/api/stream`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      }).then(response => {
        if (!response.body) {
          throw new Error('No response body from stream endpoint');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              clearTimeout(timeoutId);
              resolve();
              return Promise.resolve();
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\\n');
            
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.type === 'connected') {
                    console.log(`✓ Stream Connected: ${data.clientId}`);
                  } else if (data.type === 'telemetry') {
                    receivedSamples++;
                    const sample = data.data;
                    console.log(`  Sample ${receivedSamples}: spd=${sample.speedKph.toFixed(1)}km/h rpm=${sample.rpm} cool=${sample.coolantC.toFixed(1)}C`);
                    
                    if (receivedSamples >= samples) {
                      clearTimeout(timeoutId);
                      reader.cancel();
                      const elapsed = Date.now() - startTime;
                      console.log(`✓ Stream test completed: ${receivedSamples} samples in ${elapsed}ms`);
                      resolve();
                    }
                  }
                } catch (error) {
                  console.error('  Parse error:', error);
                }
              }
            });
            
            return readStream();
          });
        }
        
        return readStream();
      }).catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
      
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Main test runner
async function runTests() {
  try {
    if (args.endpoint === 'sse' || args.endpoint === 'both') {
      await testSSE(args.host, args.samples, args.timeout);
    }
    
    if (args.endpoint === 'ws' || args.endpoint === 'both') {
      await testWebSocket(args.host, args.samples, args.timeout);
    }
    
    console.log('\\n✓ All stream tests completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\\n✗ Stream test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Check if Next.js dev server is running
async function checkServer(host: string) {
  try {
    const response = await fetch(host);
    return response.ok;
  } catch {
    return false;
  }
}

// Start tests
checkServer(args.host).then(isRunning => {
  if (!isRunning) {
    console.error(`✗ Server not running at ${args.host}`);
    console.log('Start the dev server with: npm run dev');
    process.exit(1);
  }
  
  runTests();
});