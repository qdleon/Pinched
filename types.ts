export interface SimulationState {
  voltage: number;      // x-axis: v_offset (V)
  frequency: number;    // y-axis (a): Frequency (kHz)
  amplitude: number;    // y-axis (b): Amplitude (mV)
  branch: 'upper' | 'lower'; // Memory state
  direction: 'increasing' | 'decreasing' | 'stationary';
}

export interface ChartPoint {
  x: number;
  y: number;
}

export const CONSTANTS = {
  VOLTAGE_MIN: -1.5,
  VOLTAGE_MAX: 1.5,
  THRESHOLD_UP: 1.0,    // Point where it jumps UP to upper branch
  THRESHOLD_DOWN: -0.9, // Point where it jumps DOWN to lower branch
  
  // Frequency Model Constants
  FREQ_BASE: 103.3,
  FREQ_SLOPE: 0.05,
  FREQ_JUMP: 0.08,

  // Amplitude Model Constants
  AMP_BASE: 16,
  AMP_CURVE: 3, // curvature
  AMP_ASYMMETRY: 0.2, // shift for the pinch
};