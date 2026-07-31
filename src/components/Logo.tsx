import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const imgSizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <div className={`flex items-center gap-3 cursor-pointer select-none group ${className}`}>
      {/* Logo Image */}
      <img
        src="/logo.jpg"
        alt="Electro-Men"
        className={`${imgSizes[size]} w-auto object-contain rounded-md transform transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]`}
      />
    </div>
  );
};
