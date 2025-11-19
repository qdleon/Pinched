
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

export interface ReservoirDataPoint {
  step: number;
  input: number;        // u(t)
  reservoirState: number; // x(t) = A(t)
  prediction: number;   // y(t)
  target: number;       // u(t+1)
}

export const CONSTANTS = {
  VOLTAGE_MIN: -1.5,
  VOLTAGE_MAX: 1.5,
  
  // Hysteresis Thresholds
  THRESHOLD_UP: 1.1,    // Right discontinuity
  THRESHOLD_DOWN: -0.9, // Left discontinuity
  
  // Frequency Model Constants (kHz)
  FREQ_LOWER_BASE: 103.28, 
  FREQ_UPPER_BASE: 103.36, 
  FREQ_SLOPE: 0.03,        

  // Amplitude Model Constants (mV) - Quadratic Models
  // Formula: y = Quad*(v^2) + Lin*v + Const
  
  // Lower Branch (Red): Concave Down, Peak at v=1
  // "Slope gets smaller and smaller" (Concave Down)
  AMP_LOWER_QUAD: -2.5,
  AMP_LOWER_LIN: 5.0,
  AMP_LOWER_CONST: 17.5,
  
  // Upper Branch (Blue): Concave Down, Peak at v=-1
  // "Slope gets smaller and smaller" (Concave Down) - Fixed from previous Concave Up
  AMP_UPPER_QUAD: -2.5,
  AMP_UPPER_LIN: -5.0,
  AMP_UPPER_CONST: 17.5,
};