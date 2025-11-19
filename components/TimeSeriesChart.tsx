
import React from 'react';
import { ReservoirDataPoint } from '../types';

interface TimeSeriesChartProps {
  data: ReservoirDataPoint[];
  width: number;
  height: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, width, height }) => {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Scales
  const maxSteps = 100; // Window size
  const minVal = 0;
  const maxVal = 3.0; // Mackey Glass usually between 0.5 and 1.5, but allow headroom

  const xScale = (i: number) => (i / (maxSteps - 1)) * innerWidth + padding.left;
  const yScale = (v: number) => height - padding.bottom - ((v - minVal) / (maxVal - minVal)) * innerHeight;

  // Generate Paths
  const inputPath = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.input)}`
  ).join(' ');

  const predictionPath = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.prediction)}`
  ).join(' ');

  // Target markers (shifted input for next step)
  const lastData = data[data.length - 1];

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative">
      <div className="absolute top-2 left-4 flex gap-4 text-xs font-bold font-mono z-10">
        <div className="flex items-center gap-1 text-white/50">
          <div className="w-2 h-2 rounded-full bg-white/50"></div>
          u(t) Input
        </div>
        <div className="flex items-center gap-1 text-cyan-400">
          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
          y(t) Prediction
        </div>
      </div>
      
      <svg width={width} height={height}>
        {/* Grid */}
        <line x1={padding.left} y1={yScale(0)} x2={width} y2={yScale(0)} stroke="#334155" strokeWidth="1" />
        <line x1={padding.left} y1={yScale(1.5)} x2={width} y2={yScale(1.5)} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
        
        {/* Input Signal */}
        <path d={inputPath} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        
        {/* Prediction Signal */}
        <path d={predictionPath} fill="none" stroke="#22d3ee" strokeWidth="2" />
        
        {/* Latest Point Indicator */}
        {lastData && (
          <>
            <circle cx={xScale(data.length-1)} cy={yScale(lastData.input)} r="3" fill="white" />
            <circle cx={xScale(data.length-1)} cy={yScale(lastData.prediction)} r="3" fill="#22d3ee" />
          </>
        )}
      </svg>
    </div>
  );
};