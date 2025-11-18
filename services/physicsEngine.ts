import { CONSTANTS, SimulationState } from '../types';

/**
 * Calculates the Frequency Response (Graph A)
 * A linear slope with a discontinuous jump based on branch state.
 */
export const calculateFrequency = (voltage: number, branch: 'upper' | 'lower'): number => {
  const linearPart = CONSTANTS.FREQ_BASE + (CONSTANTS.FREQ_SLOPE * voltage);
  const offsetPart = branch === 'upper' ? CONSTANTS.FREQ_JUMP : 0;
  return linearPart + offsetPart;
};

/**
 * Calculates the Amplitude Response (Graph B - Pinched Loop)
 * Modeled as two intersecting parabolas/bell-curves to create the butterfly shape.
 */
export const calculateAmplitude = (voltage: number, branch: 'upper' | 'lower'): number => {
  // To create the "pinch" and crossing at 0:
  // The "Upper" branch (Blue, active when decreasing) peaks at negative voltage
  // The "Lower" branch (Red, active when increasing) peaks at positive voltage
  
  if (branch === 'upper') {
    // Active when coming from right to left (Blue path)
    // Visually corresponds to the curve that is higher on the left side
    // Modeled as a peak shifted slightly left
    return CONSTANTS.AMP_BASE - CONSTANTS.AMP_CURVE * Math.pow(Math.abs(voltage + CONSTANTS.AMP_ASYMMETRY), 1.5);
  } else {
    // Active when coming from left to right (Red path)
    // Visually corresponds to the curve that is higher on the right side
    // Modeled as a peak shifted slightly right
    return CONSTANTS.AMP_BASE - CONSTANTS.AMP_CURVE * Math.pow(Math.abs(voltage - CONSTANTS.AMP_ASYMMETRY), 1.5);
  }
};

/**
 * Main step function to advance simulation state.
 * Handles the memory logic (hysteresis triggers).
 */
export const stepSimulation = (
  targetVoltage: number, 
  currentState: SimulationState
): SimulationState => {
  const { branch, voltage: prevVoltage } = currentState;
  
  let newBranch = branch;
  let direction: 'increasing' | 'decreasing' | 'stationary' = 'stationary';

  if (targetVoltage > prevVoltage) direction = 'increasing';
  if (targetVoltage < prevVoltage) direction = 'decreasing';

  // Hysteresis Logic
  if (direction === 'increasing' && targetVoltage >= CONSTANTS.THRESHOLD_UP) {
    newBranch = 'upper'; // Jump UP on the right side
  } else if (direction === 'decreasing' && targetVoltage <= CONSTANTS.THRESHOLD_DOWN) {
    newBranch = 'lower'; // Jump DOWN on the left side
  }

  return {
    voltage: targetVoltage,
    frequency: calculateFrequency(targetVoltage, newBranch),
    amplitude: calculateAmplitude(targetVoltage, newBranch),
    branch: newBranch,
    direction
  };
};