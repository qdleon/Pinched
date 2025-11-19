
import React, { useState, useEffect, useRef } from 'react';
import { HysteresisChart } from './components/HysteresisChart';
import { stepSimulation, calculateAmplitude } from './services/physicsEngine';
import { CONSTANTS, SimulationState } from './types';
import { RotateCcw, Info, Cpu, ArrowUpFromLine, ArrowDownFromLine, Play, Square, Gauge } from 'lucide-react';

const BIT_COUNT = 1;

const App: React.FC = () => {
  // Initialize bits
  // Default state: 0V, Lower Branch
  const createInitialState = (): SimulationState => ({
    voltage: 0,
    frequency: CONSTANTS.FREQ_LOWER_BASE, // Unused but required by type
    amplitude: calculateAmplitude(0, 'lower'),
    branch: 'lower', 
    direction: 'stationary'
  });

  const [bits, setBits] = useState<SimulationState[]>(
    Array(BIT_COUNT).fill(null).map(createInitialState)
  );

  // Animation State - Start sweeping automatically
  const [isSweeping, setIsSweeping] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const phaseRef = useRef<number>(0); // Accumulate phase for smooth speed changes
  const speedRef = useRef(speed);

  // Keep ref in sync for animation loop without re-triggering effect
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Animation Loop
  useEffect(() => {
    if (isSweeping) {
        // Reset lastTime on start to avoid huge delta
        lastTimeRef.current = 0;

        const animate = (time: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            
            // Calculate delta time in seconds
            const deltaTime = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;

            // Update phase based on current speed
            // Base Frequency = 0.166Hz (6s period)
            const baseFreq = 0.166; 
            phaseRef.current += 2 * Math.PI * baseFreq * speedRef.current * deltaTime;
            
            const v = CONSTANTS.VOLTAGE_MAX * Math.sin(phaseRef.current);
            
            setBits(prev => prev.map(bit => stepSimulation(v, bit)));
            animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
    } else {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        lastTimeRef.current = 0;
        // We deliberately do not reset phaseRef here so it resumes smoothly if toggled back
    }

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSweeping]); // Removed speed from dependency to prevent jumps

  const handleResetPhase = () => {
    phaseRef.current = 0;
  };

  // Handle manual slider change for a specific bit
  const handleBitVoltageChange = (index: number, newVoltage: number) => {
    setBits(prevBits => {
      const newBits = [...prevBits];
      newBits[index] = stepSimulation(newVoltage, newBits[index]);
      return newBits;
    });
  };

  // "Write" operation: Simulate a pulse that switches the state and returns to 0
  const pulseBit = (index: number, targetValue: '0' | '1') => {
    setBits(prevBits => {
      const newBits = [...prevBits];
      let currentState = newBits[index];

      if (targetValue === '1') {
        // Pulse High to switch to Upper Branch
        currentState = stepSimulation(1.5, currentState);
        currentState = stepSimulation(0, currentState);
      } else {
        // Pulse Low to switch to Lower Branch
        currentState = stepSimulation(-1.5, currentState);
        currentState = stepSimulation(0, currentState);
      }

      newBits[index] = currentState;
      return newBits;
    });
  };

  const resetAll = () => {
    setIsSweeping(false); // Stop animation on reset
    handleResetPhase();   // Reset phase to 0
    setBits(Array(BIT_COUNT).fill(null).map(createInitialState));
  };

  // Calculate the bit code
  const bitValues = bits.map(b => b.branch === 'upper' ? 1 : 0);
  const decimalValue = parseInt(bitValues.join(''), 2);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 sm:p-8 font-sans">
      
      {/* Header Section */}
      <header className="w-full max-w-4xl mb-8 border-b border-slate-700 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-indigo-400" />
            Single-Bit Mechanical Memory
          </h1>
          <p className="text-slate-400 mt-2 max-w-xl text-sm">
            Using the <span className="text-indigo-300">Pinched Hysteresis Loop</span> (Amplitude) to encode information. 
            <br/>
            {/* Swapped Colors: Blue=Lower/0, Red=Upper/1 */}
            <span className="text-blue-400">Blue (Lower) = 0</span>, <span className="text-red-400">Red (Upper) = 1</span>.
          </p>
        </div>

        {/* Digital Code Display */}
        <div className="flex flex-col items-end bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg min-w-[150px]">
          <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Current State</div>
          <div className="flex items-baseline gap-3">
             <div className="flex gap-1">
                {bitValues.map((val, i) => (
                  <span 
                    key={i} 
                    // Swapped Colors: 1 = Red, 0 = Blue
                    className={`text-3xl font-mono font-bold w-8 text-center transition-colors duration-300 ${val === 1 ? 'text-red-400' : 'text-blue-400'}`}
                  >
                    {val}
                  </span>
                ))}
             </div>
             <span className="text-slate-600 text-sm font-mono">
                (DEC: {decimalValue})
             </span>
          </div>
        </div>
      </header>

      {/* Main Display - Centered Single Item */}
      <main className="w-full max-w-2xl flex flex-col items-center gap-6 mb-8">
        {bits.map((bitState, index) => (
          <div key={index} className="w-full bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-md flex flex-col gap-4 transition-all duration-500">
            
            {/* Chart Area */}
            <div className="relative">
                <HysteresisChart 
                  bitIndex={index}
                  currentVoltage={bitState.voltage}
                  currentValue={bitState.amplitude}
                  currentBranch={bitState.branch}
                  currentDirection={bitState.direction}
                  yDomain={[0, 25]}
                />
                {/* Bit Status Badge */}
                {/* Swapped Colors: Upper=Red, Lower=Blue */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold border transition-colors duration-300 ${
                    bitState.branch === 'upper' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                    VAL: {bitState.branch === 'upper' ? '1' : '0'}
                </div>
            </div>

            {/* Controls Area */}
            <div className={`bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-3 transition-opacity ${isSweeping ? 'opacity-75 pointer-events-none' : ''}`}>
                {/* Voltage Slider */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-12 text-right">
                        {bitState.voltage.toFixed(2)}V
                    </span>
                    <input 
                        type="range" 
                        min={CONSTANTS.VOLTAGE_MIN} 
                        max={CONSTANTS.VOLTAGE_MAX} 
                        step="0.01" 
                        value={bitState.voltage} 
                        disabled={isSweeping}
                        onChange={(e) => handleBitVoltageChange(index, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-white disabled:accent-slate-600"
                    />
                </div>

                {/* Write Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => pulseBit(index, '0')}
                        disabled={isSweeping}
                        // Swapped: Write 0 => Blue
                        className="flex items-center justify-center gap-2 py-2 rounded bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 transition-colors text-xs font-bold uppercase disabled:opacity-50"
                    >
                        <ArrowDownFromLine size={14} />
                        Write 0
                    </button>
                    <button 
                        onClick={() => pulseBit(index, '1')}
                        disabled={isSweeping}
                        // Swapped: Write 1 => Red
                        className="flex items-center justify-center gap-2 py-2 rounded bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 transition-colors text-xs font-bold uppercase disabled:opacity-50"
                    >
                        <ArrowUpFromLine size={14} />
                        Write 1
                    </button>
                </div>
            </div>
          </div>
        ))}
      </main>

      {/* Footer Info & Controls */}
      <section className="w-full max-w-4xl flex flex-col gap-4">
        
        {/* Control Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            
            {/* Speed Control */}
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 text-slate-400">
                    <Gauge size={18} />
                    <span className="text-sm font-medium">Speed</span>
                </div>
                <div className="flex items-center gap-3 flex-1 md:flex-none">
                    <span className="text-xs font-mono text-slate-500 w-8 text-right">{speed.toFixed(1)}x</span>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="3.0" 
                        step="0.1" 
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full md:w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300"
                    />
                </div>
            </div>

            {/* Play/Reset Controls */}
            <div className="flex gap-3 w-full md:w-auto justify-end">
                <button
                    onClick={() => setIsSweeping(!isSweeping)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors font-medium ${
                    isSweeping 
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-slate-700'
                    }`}
                >
                    {isSweeping ? <Square size={16} fill="currentColor" className="scale-90"/> : <Play size={16} fill="currentColor" />}
                    <span>{isSweeping ? 'Stop Auto' : 'Auto Sweep'}</span>
                </button>
                
                <button 
                    onClick={resetAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                >
                    <RotateCcw size={16} />
                    <span>Reset</span>
                </button>
            </div>
        </div>

        {/* Info Card */}
        <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 flex items-start space-x-3">
            <Info className="text-indigo-400 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-slate-300">
                <strong className="text-indigo-300 block mb-1">Encoding with Jumps</strong>
                <p>
                    Information is stored in the bistable amplitude response at 0V.
                    <br/>
                    To write a <strong>1</strong> (Red), the voltage is swept past {CONSTANTS.THRESHOLD_UP}V.
                    To write a <strong>0</strong> (Blue), the voltage is swept past {CONSTANTS.THRESHOLD_DOWN}V.
                </p>
            </div>
        </div>

      </section>

    </div>
  );
};

export default App;
