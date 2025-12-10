import Image from 'next/image';

import { AppConfig } from '@/utils/AppConfig';

export const Logo = (props: {
  isTextHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const iconSize = sizeClasses[props.size || 'md'];
  const textSize = textSizeClasses[props.size || 'md'];

  return (
    <div className={`flex items-center ${textSize} font-bold`}>
      <div className="relative mr-2.5 overflow-hidden rounded-lg">
        <Image
          src="/logor.png"
          alt="AuditFlow Logo"
          width={iconSize.width}
          height={iconSize.height}
          className="object-contain mix-blend-multiply"
          style={{ background: 'transparent' }}
        />
      </div>
      {!props.isTextHidden && (
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {AppConfig.name}
        </span>
      )}
    </div>
  );
};
