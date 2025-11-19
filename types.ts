
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
  
  // Hysteresis Thresholds
  THRESHOLD_UP: 1.1,    // Right discontinuity
  THRESHOLD_DOWN: -0.9, // Left discontinuity
  
  // Frequency Model Constants (kHz)
  FREQ_LOWER_BASE: 103.28, 
  FREQ_UPPER_BASE: 103.36, 
  FREQ_SLOPE: 0.03,        

  // Amplitude Model Constants (mV) - Quadratic Models
  // Formula: y = Quad*(v^2) + Lin*v + Const
  
  // Lower Branch (Blue): Concave Down, Peak at v=-1 (Left)
  // Swapped to enable upward jump at right threshold
  AMP_LOWER_QUAD: -2.5,
  AMP_LOWER_LIN: -5.0, 
  AMP_LOWER_CONST: 17.5,
  
  // Upper Branch (Red): Concave Down, Peak at v=1 (Right)
  // Swapped to enable upward jump at left threshold
  AMP_UPPER_QUAD: -2.5,
  AMP_UPPER_LIN: 5.0,
  AMP_UPPER_CONST: 17.5,
};
