import React from 'react';
import packageJson from '../../package.json';

const AppVersionDisplay: React.FC = () => {
  const version = packageJson.version;
  
  return (
    <span className="text-xs text-muted-foreground mt-1">
      Versão 0.0.{version}
    </span>
  );
};

export default AppVersionDisplay;