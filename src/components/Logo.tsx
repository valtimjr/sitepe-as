import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <img
        src="/Gemini_Generated_Image_93fii993fii993fi.png"
        alt="Elétrica RPM Logo"
        className="h-24 md:h-32 lg:h-40 object-contain"
      />
    </div>
  );
};

export default Logo;