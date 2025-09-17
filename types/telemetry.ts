import { z } from 'zod';

/**
 * Core TypeScript interfaces and types for the Car Telemetry Simulator
 * This file serves as the single source of truth for all telemetry-related types
 * to prevent drift between simulation, transport, and UI layers.
 * Uses Zod for runtime validation and type inference.
 */

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Alert Severity Schema
export const AlertSeveritySchema = z.enum(['warning', 'critical']);

// Metric Key Schema
export const MetricKeySchema = z.enum([
  // Core vehicle metrics
  'speedKph',
  'rpm',
  'gear',
  'throttlePct',
  'brakePct',
  'steeringDeg',
  // Temperature metrics
  'coolantC',
  'oilC',
  'tireTempFL',
  'tireTempFR',
  'tireTempRL',
  'tireTempRR',
  // Battery metrics
  'batteryV',
  'stateOfCharge',
  // Location metrics
  'latitude',
  'longitude',
  'lap',
  'sector',
]);

// Rule Operator Schema
export const RuleOperatorSchema = z.enum(['>', '<', '>=', '<=', '==', '!=']);

// Vehicle Schema
export const VehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  maxRpm: z.number().positive(),
  tireSpec: z.string(),
  batterySpec: z.string(),
});

// Telemetry Sample Schema
export const TelemetrySampleSchema = z.object({
  timestamp: z.number(),
  vehicleId: z.string(),
  speedKph: z.number().min(0),
  rpm: z.number().min(0),
  gear: z.number().int().min(0),
  throttlePct: z.number().min(0).max(100),
  brakePct: z.number().min(0).max(100),
  steeringDeg: z.number().min(-180).max(180),
  coolantC: z.number(),
  oilC: z.number(),
  batteryV: z.number().positive(),
  stateOfCharge: z.number().min(0).max(100),
  tireTemps: z.object({
    FL: z.number(),
    FR: z.number(),
    RL: z.number(),
    RR: z.number(),
  }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  lap: z.number().int().min(0),
  sector: z.number().int().min(0),
});

// Alert Schema
export const AlertSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  ruleId: z.string(),
  severity: AlertSeveritySchema,
  message: z.string(),
  firstSeen: z.number(),
  lastSeen: z.number(),
  active: z.boolean(),
});

// Rule Schema
export const RuleSchema = z.object({
  id: z.string(),
  metricKey: MetricKeySchema,
  operator: RuleOperatorSchema,
  threshold: z.number(),
  windowMs: z.number().positive(),
  severity: AlertSeveritySchema,
});

// Track Schema
export const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  lengthM: z.number().positive(),
  polyline: z.array(z.tuple([z.number(), z.number()])), // [latitude, longitude] pairs
  sectorBreaks: z.array(z.number().min(0)), // distances in meters where sectors begin
});

// Session Schema
export const SessionSchema = z.object({
  id: z.string(),
  seed: z.number().int(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  vehicles: z.array(z.string()), // vehicle IDs
});

// ============================================================================
// INFERRED TYPES FROM ZOD SCHEMAS
// ============================================================================

export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type MetricKey = z.infer<typeof MetricKeySchema>;
export type RuleOperator = z.infer<typeof RuleOperatorSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type TelemetrySample = z.infer<typeof TelemetrySampleSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Session = z.infer<typeof SessionSchema>;

// ============================================================================
// DERIVED TYPES
// ============================================================================

export type TirePosition = 'FL' | 'FR' | 'RL' | 'RR';

export interface TireTempData {
  position: TirePosition;
  temperature: number;
}

// ============================================================================
// VALIDATION HELPERS (Using Zod)
// ============================================================================

/**
 * Validates and parses a TelemetrySample object
 */
export function validateTelemetrySample(obj: unknown): TelemetrySample {
  return TelemetrySampleSchema.parse(obj);
}

/**
 * Safely validates a TelemetrySample object (returns result object)
 */
export function safeValidateTelemetrySample(obj: unknown) {
  return TelemetrySampleSchema.safeParse(obj);
}

/**
 * Validates and parses an Alert object
 */
export function validateAlert(obj: unknown): Alert {
  return AlertSchema.parse(obj);
}

/**
 * Safely validates an Alert object (returns result object)
 */
export function safeValidateAlert(obj: unknown) {
  return AlertSchema.safeParse(obj);
}

/**
 * Validates and parses a Rule object
 */
export function validateRule(obj: unknown): Rule {
  return RuleSchema.parse(obj);
}

/**
 * Safely validates a Rule object (returns result object)
 */
export function safeValidateRule(obj: unknown) {
  return RuleSchema.safeParse(obj);
}

/**
 * Validates and parses a Vehicle object
 */
export function validateVehicle(obj: unknown): Vehicle {
  return VehicleSchema.parse(obj);
}

/**
 * Safely validates a Vehicle object (returns result object)
 */
export function safeValidateVehicle(obj: unknown) {
  return VehicleSchema.safeParse(obj);
}

// ============================================================================
// LEGACY TYPE GUARDS (for backward compatibility)
// ============================================================================

/**
 * Type guard to validate if an object is a valid TelemetrySample
 * @deprecated Use validateTelemetrySample() or safeValidateTelemetrySample() instead
 */
export function isTelemetrySample(obj: unknown): obj is TelemetrySample {
  return TelemetrySampleSchema.safeParse(obj).success;
}

/**
 * Type guard to validate if an object is a valid Alert
 * @deprecated Use validateAlert() or safeValidateAlert() instead
 */
export function isAlert(obj: unknown): obj is Alert {
  return AlertSchema.safeParse(obj).success;
}

/**
 * Type guard to validate if an object is a valid Rule
 * @deprecated Use validateRule() or safeValidateRule() instead
 */
export function isRule(obj: unknown): obj is Rule {
  return RuleSchema.safeParse(obj).success;
}

/**
 * Type guard to validate if an object is a valid Vehicle
 * @deprecated Use validateVehicle() or safeValidateVehicle() instead
 */
export function isVehicle(obj: unknown): obj is Vehicle {
  return VehicleSchema.safeParse(obj).success;
}

// ============================================================================
// SAMPLE DATA FOR TESTING
// ============================================================================

/**
 * Sample TelemetrySample for testing and validation
 */
export const sampleTelemetrySample: TelemetrySample = {
  timestamp: Date.now(),
  vehicleId: 'vehicle-001',
  speedKph: 120.5,
  rpm: 3500,
  gear: 3,
  throttlePct: 75,
  brakePct: 0,
  steeringDeg: -5.2,
  coolantC: 85,
  oilC: 90,
  batteryV: 12.8,
  stateOfCharge: 85,
  tireTemps: {
    FL: 65,
    FR: 68,
    RL: 62,
    RR: 63,
  },
  latitude: 37.7749,
  longitude: -122.4194,
  lap: 1,
  sector: 2,
};

/**
 * Sample Alert for testing and validation
 */
export const sampleAlert: Alert = {
  id: 'alert-001',
  vehicleId: 'vehicle-001',
  ruleId: 'rule-high-rpm',
  severity: 'warning',
  message: 'RPM exceeded 95% for 5 seconds',
  firstSeen: Date.now() - 5000,
  lastSeen: Date.now(),
  active: true,
};

/**
 * Sample Rule for testing and validation
 */
export const sampleRule: Rule = {
  id: 'rule-high-rpm',
  metricKey: 'rpm',
  operator: '>',
  threshold: 0.95,
  windowMs: 5000,
  severity: 'warning',
};

/**
 * Sample Vehicle for testing and validation
 */
export const sampleVehicle: Vehicle = {
  id: 'vehicle-001',
  name: 'Test Car',
  model: 'Simulator V1',
  maxRpm: 7000,
  tireSpec: 'Pirelli P Zero',
  batterySpec: '12V Lead Acid',
};

// ============================================================================
// VALIDATION TESTING FUNCTIONS
// ============================================================================

/**
 * Validates all sample data using Zod schemas
 * Throws an error if any sample data is invalid
 */
export function validateSampleData(): boolean {
  try {
    // These will throw if the sample data doesn't match the schemas
    validateTelemetrySample(sampleTelemetrySample);
    validateAlert(sampleAlert);
    validateRule(sampleRule);
    validateVehicle(sampleVehicle);
    return true;
  } catch (error) {
    throw new Error(`Sample data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Safely validates all sample data and returns detailed results
 */
export function safeValidateSampleData() {
  const results = {
    telemetrySample: safeValidateTelemetrySample(sampleTelemetrySample),
    alert: safeValidateAlert(sampleAlert),
    rule: safeValidateRule(sampleRule),
    vehicle: safeValidateVehicle(sampleVehicle),
  };

  const allValid = Object.values(results).every(result => result.success);

  return {
    success: allValid,
    results,
    errors: allValid ? [] : Object.entries(results)
      .filter(([, result]) => !result.success)
      .map(([key, result]) => ({
        type: key,
        error: result.error?.format() || 'Unknown validation error',
      })),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a new TelemetrySample with current timestamp
 */
export function createTelemetrySample(partial: Omit<TelemetrySample, 'timestamp'>): TelemetrySample {
  return {
    timestamp: Date.now(),
    ...partial,
  };
}

/**
 * Creates a new Alert with current timestamps
 */
export function createAlert(partial: Omit<Alert, 'firstSeen' | 'lastSeen'>): Alert {
  const now = Date.now();
  return {
    firstSeen: now,
    lastSeen: now,
    ...partial,
  };
}

/**
 * Updates an alert's lastSeen timestamp
 */
export function updateAlertLastSeen(alert: Alert): Alert {
  return {
    ...alert,
    lastSeen: Date.now(),
  };
}

/**
 * Deactivates an alert
 */
export function deactivateAlert(alert: Alert): Alert {
  return {
    ...alert,
    active: false,
    lastSeen: Date.now(),
  };
}