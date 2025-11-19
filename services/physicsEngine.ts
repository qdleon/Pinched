
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

/**
 * Mackey-Glass Chaotic Time Series Generator
 */
export class MackeyGlassGenerator {
  private history: number[] = [];
  private t = 0;
  // Standard constants for chaos
  private beta = 0.2;
  private gamma = 0.1;
  private tau = 17; 
  private n = 10;
  private val = 1.2;

  constructor() {
    // Seed history
    for(let i=0; i<200; i++) {
       this.history.push(1.2);
    }
  }

  next(): number {
    const xt = this.val;
    const xt_tau = this.history[this.history.length - this.tau] || 1.2;
    
    // Differential equation approximation
    const delta = (this.beta * xt_tau) / (1 + Math.pow(xt_tau, this.n)) - (this.gamma * xt);
    
    this.val = xt + delta;
    this.history.push(this.val);
    
    // Keep history manageable
    if (this.history.length > 300) this.history.shift();
    
    return this.val;
  }
  
  reset() {
      this.history = Array(200).fill(1.2);
      this.val = 1.2;
      this.t = 0;
  }
}

/**
 * Linear Readout Layer with LMS (Least Mean Squares) Learning
 * Maps Reservoir State -> Prediction
 */
export class ReadoutLayer {
  // Weights for [Bias, Input, ReservoirState, ReservoirState^2]
  // Made PUBLIC so we can visualize them in the UI to prove it's learning
  public weights: number[] = [0, 0, 0, 0]; 
  private learningRate = 0.02; // Slightly slower learning to make it visible

  predict(input: number, reservoirState: number): number {
    // Normalize inputs slightly for stability
    const features = [
        1,                  // Bias
        input,              // u(t) - Direct path
        reservoirState/20,  // x(t) - Scaled
        Math.pow(reservoirState/20, 2) // x(t)^2 - Nonlinear readout capability
    ];
    
    return features.reduce((sum, f, i) => sum + f * this.weights[i], 0);
  }

  train(input: number, reservoirState: number, target: number) {
    const features = [
        1, 
        input, 
        reservoirState/20, 
        Math.pow(reservoirState/20, 2)
    ];
    
    const prediction = features.reduce((sum, f, i) => sum + f * this.weights[i], 0);
    const error = target - prediction;

    // Update weights: w_new = w_old + learning_rate * error * input
    this.weights = this.weights.map((w, i) => w + this.learningRate * error * features[i]);
    
    return error;
  }
  
  reset() {
      this.weights = [0, 0, 0, 0];
  }
}
