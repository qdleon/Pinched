
import React, { useMemo } from 'react';
import { CONSTANTS } from '../types';
import { calculateAmplitude } from '../services/physicsEngine';

interface HysteresisChartProps {
  bitIndex: number;
  currentVoltage: number;
  currentValue: number;
  currentBranch: 'upper' | 'lower';
  currentDirection: 'increasing' | 'decreasing' | 'stationary';
  yDomain: [number, number];
}

export const HysteresisChart: React.FC<HysteresisChartProps> = ({
  bitIndex,
  currentVoltage,
  currentValue,
  currentBranch,
  currentDirection,
  yDomain,
}) => {
  // Dimensions
  const width = 400;
  const height = 250; // Slightly shorter for grid
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Scales
  const xScale = (v: number) => {
    const normalized = (v - CONSTANTS.VOLTAGE_MIN) / (CONSTANTS.VOLTAGE_MAX - CONSTANTS.VOLTAGE_MIN);
    return padding.left + normalized * innerWidth;
  };

  const yScale = (v: number) => {
    const normalized = (v - yDomain[0]) / (yDomain[1] - yDomain[0]);
    return height - padding.bottom - (normalized * innerHeight);
  };

  // Pre-calculate static paths for the "Ghost" background curves
  const paths = useMemo(() => {
    const steps = 100;
    const stepSize = (CONSTANTS.VOLTAGE_MAX - CONSTANTS.VOLTAGE_MIN) / steps;
    
    let pathUpper = "";
    let pathLower = "";

    for (let i = 0; i <= steps; i++) {
      const v = CONSTANTS.VOLTAGE_MIN + i * stepSize;
      // Always calculate Amplitude
      const valUpper = calculateAmplitude(v, 'upper');
      const valLower = calculateAmplitude(v, 'lower');
      
      const x = xScale(v);
      const yUp = yScale(valUpper);
      const yLow = yScale(valLower);

      pathUpper += `${i === 0 ? 'M' : 'L'} ${x},${yUp} `;
      pathLower += `${i === 0 ? 'M' : 'L'} ${x},${yLow} `;
    }
    return { upper: pathUpper, lower: pathLower };
  }, [yDomain]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine active color based on branch
  // Upper Branch = Blue, Lower Branch = Red
  const strokeColor = currentBranch === 'upper' ? '#3b82f6' : '#ef4444';

  return (
    <div className="bg-white rounded-lg overflow-hidden">
       {/* Title overlay inside the component for cleaner grid */}
       <div className="absolute top-2 left-4 z-10">
         <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bit #{bitIndex}</span>
       </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid Lines */}
        <line x1={padding.left} y1={yScale(yDomain[0])} x2={width - padding.right} y2={yScale(yDomain[0])} stroke="#e2e8f0" />
        <line x1={padding.left} y1={yScale(yDomain[1])} x2={width - padding.right} y2={yScale(yDomain[1])} stroke="#e2e8f0" />
        <line x1={xScale(0)} y1={padding.top} x2={xScale(0)} y2={height - padding.bottom} stroke="#cbd5e1" strokeDasharray="4,4" />

        {/* Axes */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#475569" strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#475569" strokeWidth="2" />

        {/* X Axis Labels */}
        <text x={xScale(CONSTANTS.VOLTAGE_MIN)} y={height - 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{CONSTANTS.VOLTAGE_MIN}</text>
        <text x={xScale(0)} y={height - 15} textAnchor="middle" fontSize="10" fill="#94a3b8">0</text>
        <text x={xScale(CONSTANTS.VOLTAGE_MAX)} y={height - 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{CONSTANTS.VOLTAGE_MAX}</text>

        {/* Y Axis Labels */}
        <text x={padding.left - 10} y={yScale(yDomain[0])} textAnchor="end" fontSize="10" fill="#94a3b8">{yDomain[0]}</text>
        <text x={padding.left - 10} y={yScale(yDomain[1])} textAnchor="end" fontSize="10" fill="#94a3b8">{yDomain[1]}</text>
        
        {/* Y Label */}
        <text 
          x={15} 
          y={height / 2} 
          transform={`rotate(-90, 15, ${height / 2})`} 
          textAnchor="middle" 
          fontSize="11" 
          fontWeight="bold" 
          fill="#64748b"
        >
          Amplitude (mV)
        </text>

        {/* Static Hysteresis Paths (Ghost) */}
        <path d={paths.upper} fill="none" stroke="#e2e8f0" strokeWidth="2" />
        <path d={paths.lower} fill="none" stroke="#e2e8f0" strokeWidth="2" />

        {/* Active Path Highlight */}
        <path 
          d={currentBranch === 'upper' ? paths.upper : paths.lower} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="3"
          className="transition-colors duration-300" 
        />

        {/* Jump Indicators (Thresholds) */}
        <line 
          x1={xScale(CONSTANTS.THRESHOLD_UP)} 
          y1={yScale(calculateAmplitude(CONSTANTS.THRESHOLD_UP, 'lower'))}
          x2={xScale(CONSTANTS.THRESHOLD_UP)} 
          y2={yScale(calculateAmplitude(CONSTANTS.THRESHOLD_UP, 'upper'))}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3"
        />
        <line 
          x1={xScale(CONSTANTS.THRESHOLD_DOWN)} 
          y1={yScale(calculateAmplitude(CONSTANTS.THRESHOLD_DOWN, 'upper'))}
          x2={xScale(CONSTANTS.THRESHOLD_DOWN)} 
          y2={yScale(calculateAmplitude(CONSTANTS.THRESHOLD_DOWN, 'lower'))}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3"
        />

        {/* Current Value Dot */}
        <circle 
          cx={xScale(currentVoltage)} 
          cy={yScale(currentValue)} 
          r="5" 
          fill={strokeColor} 
          stroke="white" 
          strokeWidth="2" 
        />

        {/* Direction Arrow */}
        <g transform={`translate(${xScale(currentVoltage)}, ${yScale(currentValue) - 12})`}>
             {currentDirection !== 'stationary' && (
                <path 
                    d="M -3 0 L 3 0 M 0 -3 L 3 0 L 0 3" 
                    transform={currentDirection === 'decreasing' ? 'rotate(180)' : ''}
                    stroke={strokeColor} 
                    strokeWidth="2" 
                    fill="none"
                />
             )}
        </g>
      </svg>
    </div>
  );
};
