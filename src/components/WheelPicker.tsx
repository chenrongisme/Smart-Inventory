import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface WheelPickerProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  height?: number;
  itemHeight?: number;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ 
  options, 
  value, 
  onChange, 
  height = 200, 
  itemHeight = 40 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(options.indexOf(value));

  useEffect(() => {
    const index = options.indexOf(value);
    if (index !== -1 && index !== selectedIndex) {
      setSelectedIndex(index);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [value, options]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index !== selectedIndex && index >= 0 && index < options.length) {
      setSelectedIndex(index);
      onChange(options[index]);
    }
  };

  return (
    <div 
      className="relative overflow-hidden bg-gray-50 rounded-2xl border border-gray-100"
      style={{ height: height }}
    >
      {/* Selection Highlight */}
      <div 
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-white border-y border-blue-100 z-0 pointer-events-none"
        style={{ height: itemHeight }}
      />
      
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar z-10"
        style={{ paddingBlock: (height - itemHeight) / 2 }}
      >
        {options.map((option, index) => (
          <div
            key={`${option}-${index}`}
            className={cn(
              "snap-center flex items-center justify-center font-bold transition-all duration-200",
              selectedIndex === index ? "text-blue-600 text-lg" : "text-gray-400 text-sm opacity-50"
            )}
            style={{ height: itemHeight }}
          >
            {option}
          </div>
        ))}
        {/* Spacer to allow scrolling to last items */}
        <div style={{ height: (height - itemHeight) / 2 }} />
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
