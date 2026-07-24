import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 text-lg',
    md: 'h-10 text-xl',
    lg: 'h-14 text-2xl md:text-3xl',
  };

  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  return (
    <div className={`flex items-center gap-3 cursor-pointer select-none group ${className}`}>
      {/* 3D Gold Circuit Logo Icon */}
      <div className="relative flex items-center justify-center">
        <svg
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
        >
          {/* Outer Circuit Circle */}
          <circle cx="50" cy="50" r="45" stroke="url(#goldGradient)" strokeWidth="3" strokeDasharray="12 4 6 4" />
          
          {/* Circuit Trace Nodes Left */}
          <path d="M10 35H25L32 45H42" stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="10" cy="35" r="3" fill="#D4AF37" />
          <circle cx="25" cy="35" r="2.5" fill="#00F0FF" />
          
          <path d="M12 50H28L35 50" stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="50" r="3" fill="#D4AF37" />
          
          <path d="M10 65H25L32 55H42" stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="10" cy="65" r="3" fill="#D4AF37" />
          <circle cx="25" cy="65" r="2.5" fill="#00F0FF" />

          {/* EM Emblem Letters in Gold & Silver */}
          <path
            d="M38 30H65V40H48V46H62V54H48V60H66V70H38V30Z"
            fill="url(#goldGradient)"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))"
          />
          <path
            d="M62 30L74 52L86 30H95V70H85V48L76 64H72L63 48V70H53V30H62Z"
            fill="url(#silverGradient)"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))"
          />

          {/* Tribal / Geometric Arc Accent Right */}
          <path
            d="M78 20 C 92 35, 92 65, 78 80"
            stroke="url(#goldGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF1B0" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#AA771C" />
              <stop offset="100%" stopColor="#F9E286" />
            </linearGradient>
            <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <span className={`font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent font-mono ${sizeClasses[size]}`}>
          ELECTRO<span className="text-slate-900 font-extrabold">-MEN</span>
        </span>
        <span className="text-[10px] md:text-[11px] tracking-widest text-slate-500 uppercase font-sans font-medium -mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
          Composants & Sourcing
        </span>
      </div>
    </div>
  );
};
