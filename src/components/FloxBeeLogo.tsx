import React from 'react';

interface FloxBeeLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

const FloxBeeLogo: React.FC<FloxBeeLogoProps> = ({ 
  className = '', 
  size = 40,
  showText = true 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Flight trail loop */}
        <path
          d="M10 70 Q 20 30, 50 40 Q 80 50, 70 20 Q 60 5, 45 25 Q 35 40, 55 50"
          stroke="hsl(162 100% 33%)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="5,3"
          fill="none"
          className="animate-pulse-soft"
        />
        
        {/* Robot Bee Body */}
        <ellipse cx="65" cy="60" rx="18" ry="15" fill="hsl(45 93% 47%)" />
        
        {/* Bee Stripes */}
        <rect x="55" y="52" width="20" height="4" rx="2" fill="hsl(0 0% 13%)" />
        <rect x="55" y="60" width="20" height="4" rx="2" fill="hsl(0 0% 13%)" />
        <rect x="55" y="68" width="20" height="4" rx="2" fill="hsl(0 0% 13%)" />
        
        {/* Robot Head */}
        <circle cx="65" cy="42" r="12" fill="hsl(200 12% 85%)" stroke="hsl(200 12% 70%)" strokeWidth="2" />
        
        {/* Antenna */}
        <line x1="60" y1="32" x2="55" y2="22" stroke="hsl(0 0% 35%)" strokeWidth="2" strokeLinecap="round" />
        <line x1="70" y1="32" x2="75" y2="22" stroke="hsl(0 0% 35%)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="55" cy="20" r="3" fill="hsl(162 100% 33%)" className="animate-pulse-soft" />
        <circle cx="75" cy="20" r="3" fill="hsl(162 100% 33%)" className="animate-pulse-soft" />
        
        {/* Robot Eyes */}
        <circle cx="60" cy="40" r="4" fill="hsl(162 100% 33%)" />
        <circle cx="70" cy="40" r="4" fill="hsl(162 100% 33%)" />
        <circle cx="61" cy="39" r="1.5" fill="white" />
        <circle cx="71" cy="39" r="1.5" fill="white" />
        
        {/* Wings */}
        <ellipse cx="50" cy="48" rx="12" ry="8" fill="hsl(200 80% 90%)" fillOpacity="0.8" stroke="hsl(200 50% 70%)" strokeWidth="1" />
        <ellipse cx="80" cy="48" rx="12" ry="8" fill="hsl(200 80% 90%)" fillOpacity="0.8" stroke="hsl(200 50% 70%)" strokeWidth="1" />
        
        {/* Stinger */}
        <path d="M83 60 L 92 60 L 88 63 Z" fill="hsl(0 0% 35%)" />
      </svg>
      
      {showText && (
        <span className="text-xl font-semibold text-foreground tracking-tight">
          Flox<span className="text-primary">Bee</span>
        </span>
      )}
    </div>
  );
};

export default FloxBeeLogo;
