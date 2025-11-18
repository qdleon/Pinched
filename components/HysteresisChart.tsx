import React, { useMemo } from 'react';
import { CONSTANTS } from '../types';
import { calculateFrequency, calculateAmplitude } from '../services/physicsEngine';

interface HysteresisChartProps {
  title: string;
  type: 'frequency' | 'amplitude';
  currentVoltage: number;
  currentValue: number;
  currentBranch: 'upper' | 'lower';
  currentDirection: 'increasing' | 'decreasing' | 'stationary';
  yDomain: [number, number];
  yLabel: string;
}

export const HysteresisChart: React.FC<HysteresisChartProps> = ({
  title,
  type,
  currentVoltage,
  currentValue,
  currentBranch,
  currentDirection,
  yDomain,
  yLabel
}) => {
  // Dimensions
  const width = 400;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  
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
      const valUpper = type === 'frequency' ? calculateFrequency(v, 'upper') : calculateAmplitude(v, 'upper');
      const valLower = type === 'frequency' ? calculateFrequency(v, 'lower') : calculateAmplitude(v, 'lower');
      
      const x = xScale(v);
      const yUp = yScale(valUpper);
      const yLow = yScale(valLower);

      pathUpper += `${i === 0 ? 'M' : 'L'} ${x},${yUp} `;
      pathLower += `${i === 0 ? 'M' : 'L'} ${x},${yLow} `;
    }
    return { upper: pathUpper, lower: pathLower };
  }, [type, yDomain]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine active color based on direction/branch
  // Paper style: Blue for decreasing (upper branch usually), Red for increasing (lower branch usually)
  const activeColor = currentBranch === 'upper' ? '#3b82f6' : '#ef4444'; // Blue-500 : Red-500

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
      <h3 className="text-center font-bold text-slate-800 mb-2">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid Lines */}
        <line x1={padding.left} y1={yScale(yDomain[0])} x2={width - padding.right} y2={yScale(yDomain[0])} stroke="#e2e8f0" />
        <line x1={padding.left} y1={yScale(yDomain[1])} x2={width - padding.right} y2={yScale(yDomain[1])} stroke="#e2e8f0" />
        <line x1={xScale(0)} y1={padding.top} x2={xScale(0)} y2={height - padding.bottom} stroke="#cbd5e1" strokeDasharray="4,4" />

        {/* Axes */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#475569" strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#475569" strokeWidth="2" />

        {/* X Axis Labels */}
        <text x={xScale(CONSTANTS.VOLTAGE_MIN)} y={height - 15} textAnchor="middle" fontSize="10" fill="#64748b">{CONSTANTS.VOLTAGE_MIN}</text>
        <text x={xScale(0)} y={height - 15} textAnchor="middle" fontSize="10" fill="#64748b">0</text>
        <text x={xScale(CONSTANTS.VOLTAGE_MAX)} y={height - 15} textAnchor="middle" fontSize="10" fill="#64748b">{CONSTANTS.VOLTAGE_MAX}</text>
        <text x={width / 2} y={height - 2} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#334155">v_offset (V)</text>

        {/* Y Axis Labels */}
        <text x={padding.left - 10} y={yScale(yDomain[0])} textAnchor="end" fontSize="10" fill="#64748b">{yDomain[0]}</text>
        <text x={padding.left - 10} y={yScale(yDomain[1])} textAnchor="end" fontSize="10" fill="#64748b">{yDomain[1]}</text>
        <text 
          x={15} 
          y={height / 2} 
          transform={`rotate(-90, 15, ${height / 2})`} 
          textAnchor="middle" 
          fontSize="12" 
          fontWeight="bold" 
          fill="#334155"
        >
          {yLabel}
        </text>

        {/* Static Hysteresis Paths (Ghost) */}
        <path d={paths.upper} fill="none" stroke="#e2e8f0" strokeWidth="2" />
        <path d={paths.lower} fill="none" stroke="#e2e8f0" strokeWidth="2" />

        {/* Highlight Active Segment based on Branch */}
        <path 
          d={currentBranch === 'upper' ? paths.upper : paths.lower} 
          fill="none" 
          stroke={activeColor} 
          strokeWidth="3"
          className="transition-colors duration-300" 
        />

        {/* Jump Indicators (Thresholds) */}
        {/* Right Jump (Up) */}
        <line 
          x1={xScale(CONSTANTS.THRESHOLD_UP)} 
          y1={yScale(type === 'frequency' ? calculateFrequency(CONSTANTS.THRESHOLD_UP, 'lower') : calculateAmplitude(CONSTANTS.THRESHOLD_UP, 'lower'))}
          x2={xScale(CONSTANTS.THRESHOLD_UP)} 
          y2={yScale(type === 'frequency' ? calculateFrequency(CONSTANTS.THRESHOLD_UP, 'upper') : calculateAmplitude(CONSTANTS.THRESHOLD_UP, 'upper'))}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2"
        />
        {/* Left Jump (Down) */}
        <line 
          x1={xScale(CONSTANTS.THRESHOLD_DOWN)} 
          y1={yScale(type === 'frequency' ? calculateFrequency(CONSTANTS.THRESHOLD_DOWN, 'upper') : calculateAmplitude(CONSTANTS.THRESHOLD_DOWN, 'upper'))}
          x2={xScale(CONSTANTS.THRESHOLD_DOWN)} 
          y2={yScale(type === 'frequency' ? calculateFrequency(CONSTANTS.THRESHOLD_DOWN, 'lower') : calculateAmplitude(CONSTANTS.THRESHOLD_DOWN, 'lower'))}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2"
        />

        {/* Current Value Dot */}
        <circle 
          cx={xScale(currentVoltage)} 
          cy={yScale(currentValue)} 
          r="6" 
          fill={activeColor} 
          stroke="white" 
          strokeWidth="2" 
        />

        {/* Direction Arrow next to dot */}
        <g transform={`translate(${xScale(currentVoltage)}, ${yScale(currentValue) - 15})`}>
             {currentDirection !== 'stationary' && (
                <path 
                    d="M -4 0 L 4 0 M 1 -3 L 4 0 L 1 3" 
                    transform={currentDirection === 'decreasing' ? 'rotate(180)' : ''}
                    stroke={activeColor} 
                    strokeWidth="2" 
                    fill="none"
                />
             )}
        </g>
      </svg>
    </div>
  );
};