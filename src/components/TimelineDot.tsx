import React from 'react';

interface TimelineDotProps {
  type: 'group' | 'end';
  isLight?: boolean;
}

const TimelineDot: React.FC<TimelineDotProps> = ({ type, isLight }) => {
  if (type === 'group') {
    return (
      <div className="absolute left-3 top-1.5 -translate-x-1/2">
        <div className={`w-2.5 h-2.5 rounded-full bg-violet-500 ring-3 ${isLight ? 'ring-white' : 'ring-[#141414]'} animate-pulse-slow`} />
      </div>
    );
  } else { // type === 'end'
    return (
      <div className="absolute left-3 top-1 -translate-x-1/2">
        <div className={`w-2 h-2 rounded-full bg-gray-600 ring-3 ${isLight ? 'ring-white' : 'ring-[#141414]'} animate-pulse-slowest`} />
      </div>
    );
  }
};

export default TimelineDot;