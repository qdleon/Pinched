
import { CONSTANTS, SimulationState } from '../types';

/**
 * Calculates the Frequency Response (Fig 8a)
 * Lower Branch: Bottom trace (Red)
 * Upper Branch: Top trace (Blue)
 */
export const calculateFrequency = (voltage: number, branch: 'upper' | 'lower'): number => {
  // Base offset based on branch
  const base = branch === 'upper' ? CONSTANTS.FREQ_UPPER_BASE : CONSTANTS.FREQ_LOWER_BASE;
  // Linear dependency on voltage
  return base + (CONSTANTS.FREQ_SLOPE * voltage);
};

/**
 * Calculates the Amplitude Response (Fig 8b)
 * Implements the "Pinched Hysteresis Loop" with quadratic curves.
 */
export const calculateAmplitude = (voltage: number, branch: 'upper' | 'lower'): number => {
  if (branch === 'lower') {
    // Red Curve: Concave Down, Peak at V=1
    // y = ax^2 + bx + c
    return (CONSTANTS.AMP_LOWER_QUAD * Math.pow(voltage, 2)) + 
           (CONSTANTS.AMP_LOWER_LIN * voltage) + 
           CONSTANTS.AMP_LOWER_CONST;
  } else {
    // Blue Curve: Concave Up, Slope increases
    // y = ax^2 + bx + c
    return (CONSTANTS.AMP_UPPER_QUAD * Math.pow(voltage, 2)) + 
           (CONSTANTS.AMP_UPPER_LIN * voltage) + 
           CONSTANTS.AMP_UPPER_CONST;
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
  // Jump UP to Upper Branch (Frequency) when increasing past THRESHOLD_UP
  // Note: In Amplitude domain, this causes a jump DOWN to the other curve
  if (direction === 'increasing' && targetVoltage >= CONSTANTS.THRESHOLD_UP) {
    newBranch = 'upper'; 
  } 
  // Jump DOWN to Lower Branch (Frequency) when decreasing past THRESHOLD_DOWN
  else if (direction === 'decreasing' && targetVoltage <= CONSTANTS.THRESHOLD_DOWN) {
    newBranch = 'lower'; 
  }

  return {
    voltage: targetVoltage,
    frequency: calculateFrequency(targetVoltage, newBranch),
    amplitude: calculateAmplitude(targetVoltage, newBranch),
    branch: newBranch,
    direction
  };
};
