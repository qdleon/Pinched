
import React, { useState, useEffect, useRef } from 'react';
import { HysteresisChart } from './components/HysteresisChart';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { stepSimulation, calculateAmplitude, MackeyGlassGenerator, ReadoutLayer } from './services/physicsEngine';
import { CONSTANTS, SimulationState, ReservoirDataPoint } from './types';
import { RotateCcw, Info, Cpu, ArrowUpFromLine, ArrowDownFromLine, Play, Square, BrainCircuit, MemoryStick, Activity, Gauge, Scale } from 'lucide-react';

const BIT_COUNT = 1;
const WINDOW_SIZE = 100;

// Instantiate generators outside component to persist across re-renders if needed, 
// though inside ref is better for full reset control.
const mackeyGlass = new MackeyGlassGenerator();
const readout = new ReadoutLayer();

const App: React.FC = () => {
  // --- Mode Selection ---
  const [mode, setMode] = useState<'memory' | 'reservoir'>('memory');

  // --- Memory Mode State ---
  const createInitialState = (): SimulationState => ({
    voltage: 0,
    frequency: CONSTANTS.FREQ_LOWER_BASE, 
    amplitude: calculateAmplitude(0, 'lower'),
    branch: 'lower', 
    direction: 'stationary'
  });

  const [bits, setBits] = useState<SimulationState[]>(
    Array(BIT_COUNT).fill(null).map(createInitialState)
  );

  // --- Reservoir Mode State ---
  const [reservoirData, setReservoirData] = useState<ReservoirDataPoint[]>([]);
  const [reservoirState, setReservoirState] = useState<SimulationState>(createInitialState());
  const [mse, setMse] = useState(0);
  const [currentWeights, setCurrentWeights] = useState<number[]>([0,0,0,0]);
  const [speed, setSpeed] = useState(5); // 1 (Slow) to 10 (Fast)

  // --- Animation Control ---
  const [isSweeping, setIsSweeping] = useState(true);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // --- Animation Loop ---
  useEffect(() => {
    if (isSweeping) {
        const animate = (time: number) => {
            if (!startTimeRef.current) startTimeRef.current = time;
            
            if (mode === 'memory') {
                // Memory Mode: Simple Sine Sweep
                const elapsed = (time - startTimeRef.current) / 1000;
                const freq = 0.166; 
                const v = CONSTANTS.VOLTAGE_MAX * Math.sin(2 * Math.PI * freq * elapsed);
                setBits(prev => prev.map(bit => stepSimulation(v, bit)));
                animationRef.current = requestAnimationFrame(animate);
            } 
            else if (mode === 'reservoir') {
                // Reservoir Mode: Chaotic Time Series Prediction
                
                // 1. Get Input u(t)
                const u_t = mackeyGlass.next();
                
                // 2. Scale u(t) to Voltage range [-1.5, 1.5]
                // Map u(t) [~0.6 to ~1.4] to [~-1.5 to ~1.5]
                // Center of thresholds (-0.9, 1.1) is 0.1.
                // Gain 4.0 ensures we hit the edges.
                const voltage = (u_t - 1.0) * 4.0 + 0.1;
                const clampedVoltage = Math.max(CONSTANTS.VOLTAGE_MIN, Math.min(CONSTANTS.VOLTAGE_MAX, voltage));

                // 3. Step Reservoir (Physics) -> Get State x(t)
                setReservoirState(prev => {
                   const next = stepSimulation(clampedVoltage, prev);
                   
                   // 4. Readout: Predict
                   // Predict current step:
                   // const y_t = readout.predict(u_t, next.amplitude);
                   
                   return next;
                });

                setReservoirData(prev => {
                   const lastPoint = prev[prev.length - 1];
                   
                   // Training Step: Train on (t-1) predicting (t)
                   if (lastPoint) {
                      const error = readout.train(lastPoint.input, lastPoint.reservoirState, u_t);
                      setMse(m => m * 0.95 + (error * error) * 0.05); // Moving average MSE
                   } else {
                      // Initial priming
                      readout.train(u_t, reservoirState.amplitude, u_t); 
                   }

                   // Capture weights for UI (prove it's learning)
                   setCurrentWeights([...readout.weights]);

                   // Generate prediction for NEXT step (One-Step-Ahead Prediction)
                   const currentPrediction = readout.predict(u_t, reservoirState.amplitude);

                   const newData = [...prev, {
                       step: prev.length,
                       input: u_t,
                       reservoirState: reservoirState.amplitude,
                       prediction: currentPrediction, 
                       target: 0 
                   }];
                   
                   if (newData.length > WINDOW_SIZE) newData.shift();
                   return newData;
                });
                
                // Loop with delay based on speed
                // Speed 10 = 0ms delay (max fps)
                // Speed 1 = 200ms delay
                const delay = Math.max(0, (10 - speed) * 25);
                
                setTimeout(() => {
                    if (isSweeping) {
                        animationRef.current = requestAnimationFrame(animate);
                    }
                }, delay);
            }
        };
        
        // Start Loop
        animationRef.current = requestAnimationFrame(animate);
        
    } else {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSweeping, mode, speed]); 

  // --- Handlers ---

  const handleBitVoltageChange = (index: number, newVoltage: number) => {
    setBits(prevBits => {
      const newBits = [...prevBits];
      newBits[index] = stepSimulation(newVoltage, newBits[index]);
      return newBits;
    });
  };

  const pulseBit = (index: number, targetValue: '0' | '1') => {
    setBits(prevBits => {
      const newBits = [...prevBits];
      let currentState = newBits[index];

      if (targetValue === '1') {
        currentState = stepSimulation(1.5, currentState);
        currentState = stepSimulation(0, currentState);
      } else {
        currentState = stepSimulation(-1.5, currentState);
        currentState = stepSimulation(0, currentState);
      }

      newBits[index] = currentState;
      return newBits;
    });
  };

  const resetAll = () => {
    setIsSweeping(false);
    setBits(Array(BIT_COUNT).fill(null).map(createInitialState));
    
    // Reservoir Reset
    mackeyGlass.reset();
    readout.reset();
    setReservoirData([]);
    setReservoirState(createInitialState());
    setMse(0);
    setCurrentWeights([0,0,0,0]);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 sm:p-8 font-sans">
      
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 border-b border-slate-700 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-indigo-400" />
            Hysteresis Computing
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
             Exploiting physical non-linearities for memory and computation.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
                onClick={() => { setMode('memory'); resetAll(); setIsSweeping(true); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'memory' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                <MemoryStick size={16} />
                Memory Bit
            </button>
            <button 
                onClick={() => { setMode('reservoir'); resetAll(); setIsSweeping(true); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'reservoir' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                <BrainCircuit size={16} />
                Reservoir Computing
            </button>
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center gap-6 mb-8">
        
        {/* --- MODE: MEMORY --- */}
        {mode === 'memory' && bits.map((bitState, index) => (
          <div key={index} className="w-full max-w-2xl bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-md flex flex-col gap-4 transition-all duration-500">
            {/* Chart */}
            <div className="relative">
                <HysteresisChart 
                  bitIndex={index}
                  currentVoltage={bitState.voltage}
                  currentValue={bitState.amplitude}
                  currentBranch={bitState.branch}
                  currentDirection={bitState.direction}
                  yDomain={[0, 25]}
                />
                <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold border transition-colors duration-300 ${
                    bitState.branch === 'upper' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                    VAL: {bitState.branch === 'upper' ? '1' : '0'}
                </div>
            </div>

            {/* Controls */}
            <div className={`bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-3 transition-opacity ${isSweeping ? 'opacity-75 pointer-events-none' : ''}`}>
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
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-white"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => pulseBit(index, '0')} className="flex items-center justify-center gap-2 py-2 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-red-400 text-xs font-bold uppercase">
                        <ArrowDownFromLine size={14} /> Write 0
                    </button>
                    <button onClick={() => pulseBit(index, '1')} className="flex items-center justify-center gap-2 py-2 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-blue-400 text-xs font-bold uppercase">
                        <ArrowUpFromLine size={14} /> Write 1
                    </button>
                </div>
            </div>
          </div>
        ))}

        {/* --- MODE: RESERVOIR --- */}
        {mode === 'reservoir' && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Col: Physical System */}
                <div className="flex flex-col gap-4">
                     <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-300 font-bold flex items-center gap-2">
                                <Activity size={18} className="text-purple-400"/>
                                Reservoir State (Phase Space)
                            </h3>
                        </div>
                        <HysteresisChart 
                            bitIndex={0}
                            currentVoltage={reservoirState.voltage}
                            currentValue={reservoirState.amplitude}
                            currentBranch={reservoirState.branch}
                            currentDirection={reservoirState.direction}
                            yDomain={[0, 25]}
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Input u(t) is mapped to voltage. The system follows the hysteresis loop. 
                            <span className="block mt-1 text-purple-300">State = Amplitude A(t)</span>
                        </p>
                     </div>

                     <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
                        <h3 className="text-slate-300 font-bold mb-3 flex items-center gap-2">
                             <Scale size={18} className="text-green-400"/>
                             Readout Weights (LMS Training)
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">MSE (Loss)</div>
                                <div className="text-xl font-mono font-bold text-red-400">{mse.toFixed(5)}</div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700 flex flex-col justify-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-slate-300 font-bold">Learning Active</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                             {['Bias', 'Input u(t)', 'State x(t)', 'x(t)²'].map((label, i) => (
                                 <div key={i} className="bg-slate-900/50 p-2 rounded border border-slate-700/50 text-center">
                                    <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                                    <div className={`text-xs font-mono ${currentWeights[i] < 0 ? 'text-red-300' : 'text-blue-300'}`}>
                                        {currentWeights[i].toFixed(3)}
                                    </div>
                                 </div>
                             ))}
                        </div>
                     </div>
                </div>

                {/* Right Col: Time Series */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-300 font-bold flex items-center gap-2">
                                <BrainCircuit size={18} className="text-cyan-400"/>
                                Chaotic Prediction
                            </h3>
                            
                            {/* Speed Control */}
                            <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                <Gauge size={14} className="text-slate-400"/>
                                <input 
                                    type="range" 
                                    min="1" max="10" 
                                    value={speed} 
                                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                                    className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 min-h-[300px]">
                             <TimeSeriesChart 
                                data={reservoirData}
                                width={450} 
                                height={300}
                             />
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-400">
                            <p>
                                <span className="text-white font-bold">White Line:</span> Input Signal u(t) (Chaotic)
                            </p>
                            <p>
                                <span className="text-cyan-400 font-bold">Cyan Line:</span> Readout Prediction y(t) ≈ u(t+1)
                            </p>
                            <p className="text-xs border-t border-slate-700 pt-2 mt-2 text-slate-500">
                                The system predicts the <em>next</em> step of the Mackey-Glass chaotic series using a linear combination of the current input and the reservoir's hysteretic state.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        )}

      </main>

      {/* Footer Controls */}
      <section className="w-full max-w-5xl flex items-center justify-end gap-3 border-t border-slate-800 pt-6">
            <button
                onClick={() => setIsSweeping(!isSweeping)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors font-medium ${
                  isSweeping 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-slate-700'
                }`}
            >
                {isSweeping ? <Square size={16} fill="currentColor" className="scale-90"/> : <Play size={16} fill="currentColor" />}
                <span>{isSweeping ? 'Pause' : 'Run'}</span>
            </button>
            
            <button 
                onClick={resetAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
            >
                <RotateCcw size={16} />
                <span>Reset</span>
            </button>
      </section>

    </div>
  );
};

export default App;
