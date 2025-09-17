import { z } from 'zod';
import { TelemetrySampleSchema } from '@/types/telemetry';

// Envelope schema for WebSocket messages
export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('connected'),
    timestamp: z.number(),
    clientId: z.string(),
    metrics: z.object({
      activeConnections: z.number(),
      messagesSent: z.number(),
      connectionsTotal: z.number(),
    }),
  }),
  z.object({
    type: z.literal('telemetry'),
    data: TelemetrySampleSchema,
    timestamp: z.number().optional(),
  }),
  z.object({
    type: z.literal('ping'),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('pong'),
    timestamp: z.number(),
    rtt: z.number().optional(),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
    code: z.string().optional(),
    timestamp: z.number().optional(),
  }),
]);

export type WSMessage = z.infer<typeof WSMessageSchema>;

export function safeParseWSMessage(raw: unknown) {
  return WSMessageSchema.safeParse(raw);
}
