
import React, { useState } from 'react';
import { HysteresisChart } from './components/HysteresisChart';
import { stepSimulation, calculateAmplitude } from './services/physicsEngine';
import { CONSTANTS, SimulationState } from './types';
import { RotateCcw, Info, Cpu, ArrowUpFromLine, ArrowDownFromLine } from 'lucide-react';

const BIT_COUNT = 4;

const App: React.FC = () => {
  // Initialize 4 independent bits
  // Default state: 0V, Lower Branch (Red/0)
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
        // 1. Go past positive threshold
        currentState = stepSimulation(1.5, currentState);
        // 2. Return to 0 (memory retention)
        currentState = stepSimulation(0, currentState);
      } else {
        // Pulse Low to switch to Lower Branch
        // 1. Go past negative threshold
        currentState = stepSimulation(-1.5, currentState);
        // 2. Return to 0 (memory retention)
        currentState = stepSimulation(0, currentState);
      }

      newBits[index] = currentState;
      return newBits;
    });
  };

  const resetAll = () => {
    setBits(Array(BIT_COUNT).fill(null).map(createInitialState));
  };

  // Calculate the 4-bit code
  // Upper Branch (Blue) = 1
  // Lower Branch (Red) = 0
  const bitValues = bits.map(b => b.branch === 'upper' ? 1 : 0);
  const decimalValue = parseInt(bitValues.join(''), 2);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 sm:p-8 font-sans">
      
      {/* Header Section */}
      <header className="w-full max-w-6xl mb-8 border-b border-slate-700 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-indigo-400" />
            4-Bit Mechanical Memory
          </h1>
          <p className="text-slate-400 mt-2 max-w-xl text-sm">
            Using the <span className="text-indigo-300">Pinched Hysteresis Loop</span> (Amplitude) to encode information. 
            <br/>
            <span className="text-red-400">Red (Lower) = 0</span>, <span className="text-blue-400">Blue (Upper) = 1</span>.
          </p>
        </div>

        {/* Digital Code Display */}
        <div className="flex flex-col items-end bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg min-w-[200px]">
          <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Current Code</div>
          <div className="flex items-baseline gap-3">
             <div className="flex gap-1">
                {bitValues.map((val, i) => (
                  <span 
                    key={i} 
                    className={`text-3xl font-mono font-bold w-8 text-center ${val === 1 ? 'text-blue-400' : 'text-red-400'}`}
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

      {/* Main Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {bits.map((bitState, index) => (
          <div key={index} className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-md flex flex-col gap-4">
            
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
                <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold border ${
                    bitState.branch === 'upper' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                    VAL: {bitState.branch === 'upper' ? '1' : '0'}
                </div>
            </div>

            {/* Controls Area */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-3">
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
                        onChange={(e) => handleBitVoltageChange(index, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-white"
                    />
                </div>

                {/* Write Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => pulseBit(index, '0')}
                        className="flex items-center justify-center gap-2 py-2 rounded bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 transition-colors text-xs font-bold uppercase"
                    >
                        <ArrowDownFromLine size={14} />
                        Write 0
                    </button>
                    <button 
                        onClick={() => pulseBit(index, '1')}
                        className="flex items-center justify-center gap-2 py-2 rounded bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 transition-colors text-xs font-bold uppercase"
                    >
                        <ArrowUpFromLine size={14} />
                        Write 1
                    </button>
                </div>
            </div>
          </div>
        ))}
      </main>

      {/* Footer Info */}
      <section className="w-full max-w-6xl flex items-center justify-between">
         <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 flex items-start space-x-3 max-w-2xl">
            <Info className="text-indigo-400 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-slate-300">
                <strong className="text-indigo-300 block mb-1">Encoding with Jumps</strong>
                <p>
                    Information is stored in the bistable amplitude response at 0V.
                    <br/>
                    To write a <strong>1</strong>, the voltage is swept past {CONSTANTS.THRESHOLD_UP}V.
                    To write a <strong>0</strong>, the voltage is swept past {CONSTANTS.THRESHOLD_DOWN}V.
                    There are 2<sup>4</sup> = 16 possible states.
                </p>
            </div>
        </div>
        
        <button 
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
        >
            <RotateCcw size={16} />
            <span>Reset All Bits</span>
        </button>
      </section>

    </div>
  );
};

export default App;
