import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HysteresisChart } from './components/HysteresisChart';
import { stepSimulation } from './services/physicsEngine';
import { CONSTANTS, SimulationState } from './types';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';

const App: React.FC = () => {
  // Initial State
  const [simState, setSimState] = useState<SimulationState>({
    voltage: 0,
    frequency: CONSTANTS.FREQ_BASE,
    amplitude: CONSTANTS.AMP_BASE,
    branch: 'lower', // Start at lower energy/frequency branch
    direction: 'stationary'
  });

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(0.5); // Hz for the UI sweep
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Simulation Loop for Auto-Sweep
  const animate = useCallback((time: number) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000; // seconds

    // Calculate sinusoidal voltage: V = A * sin(2 * pi * f * t)
    // We scale it to cover the range [-1.4, 1.4] to ensure we hit thresholds
    const voltage = 1.4 * Math.sin(2 * Math.PI * autoSpeed * elapsed);

    setSimState(prevState => stepSimulation(voltage, prevState));
    requestRef.current = requestAnimationFrame(animate);
  }, [autoSpeed]);

  useEffect(() => {
    if (isAutoPlaying) {
      startTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isAutoPlaying, animate]);

  // Manual Slider Handler
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAutoPlaying) setIsAutoPlaying(false); // Stop auto if user intervenes
    const newVoltage = parseFloat(e.target.value);
    setSimState(prevState => stepSimulation(newVoltage, prevState));
  };

  const handleReset = () => {
    setIsAutoPlaying(false);
    setSimState({
      voltage: 0,
      frequency: CONSTANTS.FREQ_BASE,
      amplitude: calculateInitialAmp(0),
      branch: 'lower',
      direction: 'stationary'
    });
  };

  // Helper to calculate amp for reset without full step logic
  const calculateInitialAmp = (v: number) => 
    16 - 3 * Math.pow(Math.abs(v - 0.2), 1.5);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 sm:p-8">
      
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 text-center sm:text-left sm:flex sm:items-end sm:justify-between border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Hysteresis Simulation</h1>
          <p className="text-slate-400 mt-2 max-w-xl">
            Visualizing memory properties in nonlinear stiffness perturbation. 
            Explore the <span className="text-blue-400">frequency</span> and <span className="text-red-400">amplitude</span> domain responses.
          </p>
        </div>
        
        <div className="hidden sm:block text-right">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">Current State</div>
          <div className={`text-lg font-bold ${simState.branch === 'upper' ? 'text-blue-400' : 'text-red-400'}`}>
            {simState.branch === 'upper' ? 'UPPER BRANCH' : 'LOWER BRANCH'}
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Graph A: Frequency Response */}
        <div className="relative group">
            <div className="absolute top-2 right-2 z-10 bg-slate-800/80 px-2 py-1 rounded text-xs text-slate-300 font-mono backdrop-blur-sm">
                Fig (a)
            </div>
            <HysteresisChart 
            title="Frequency Response"
            type="frequency"
            currentVoltage={simState.voltage}
            currentValue={simState.frequency}
            currentBranch={simState.branch}
            currentDirection={simState.direction}
            yDomain={[103.25, 103.45]}
            yLabel="Frequency (kHz)"
            />
            <div className="mt-2 text-sm text-slate-400 px-2">
               Shows a single hysteresis loop with discontinuities at <span className="text-slate-200 font-mono">±1.0V</span>.
            </div>
        </div>

        {/* Graph B: Amplitude Response */}
        <div className="relative group">
            <div className="absolute top-2 right-2 z-10 bg-slate-800/80 px-2 py-1 rounded text-xs text-slate-300 font-mono backdrop-blur-sm">
                Fig (b)
            </div>
            <HysteresisChart 
            title="Amplitude Response"
            type="amplitude"
            currentVoltage={simState.voltage}
            currentValue={simState.amplitude}
            currentBranch={simState.branch}
            currentDirection={simState.direction}
            yDomain={[8, 20]}
            yLabel="Output Amplitude (mV)"
            />
            <div className="mt-2 text-sm text-slate-400 px-2">
               Shows a <i>pinched</i> hysteresis loop (butterfly shape) with a crossing point near <span className="text-slate-200 font-mono">0V</span>.
            </div>
        </div>

      </main>

      {/* Controls & readout */}
      <section className="w-full max-w-5xl bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Physics Readout */}
            <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span className="text-slate-400">v_offset:</span>
                    <span className="text-white">{simState.voltage.toFixed(3)} V</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span className="text-slate-400">Frequency:</span>
                    <span className="text-blue-300">{simState.frequency.toFixed(3)} kHz</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Amplitude:</span>
                    <span className="text-red-300">{simState.amplitude.toFixed(3)} mV</span>
                </div>
            </div>

            {/* Main Slider */}
            <div className="flex flex-col justify-center space-y-4">
                <label className="text-sm font-medium text-slate-300 flex justify-between">
                    <span>Manual Sweep Control</span>
                    <span className="text-xs text-slate-500">Drag to see memory effect</span>
                </label>
                <input 
                    type="range" 
                    min={CONSTANTS.VOLTAGE_MIN} 
                    max={CONSTANTS.VOLTAGE_MAX} 
                    step="0.01" 
                    value={simState.voltage} 
                    onChange={handleSliderChange}
                    className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex justify-between text-xs text-slate-500 font-mono">
                    <span>{CONSTANTS.VOLTAGE_MIN}V</span>
                    <span>0V</span>
                    <span>+{CONSTANTS.VOLTAGE_MAX}V</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center md:items-end space-y-4">
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                            isAutoPlaying 
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg hover:shadow-indigo-500/25'
                        }`}
                    >
                        {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
                        <span>{isAutoPlaying ? 'Pause Sweep' : 'Auto Sweep'}</span>
                    </button>

                    <button 
                        onClick={handleReset}
                        className="p-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 hover:text-white transition-colors"
                        title="Reset Simulation"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>

                {/* Legend */}
                <div className="flex items-center space-x-4 text-xs bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                     <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-400">Increasing V (Low State)</span>
                     </div>
                     <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-slate-400">Decreasing V (High State)</span>
                     </div>
                </div>
            </div>
        </div>

        {/* Memory Property Explanation */}
        <div className="mt-6 bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 flex items-start space-x-3">
            <Info className="text-indigo-400 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-slate-300">
                <strong className="text-indigo-300 block mb-1">Memory Property (Hysteresis)</strong>
                At <span className="font-mono text-white">v = 0</span>, the system can exist in two different states depending on its history. 
                If coming from positive voltage, it follows the <span className="text-blue-400">Upper Branch</span>. 
                If coming from negative voltage, it follows the <span className="text-red-400">Lower Branch</span>. 
                This path-dependence creates the loop.
            </div>
        </div>

      </section>
    </div>
  );
};

export default App;