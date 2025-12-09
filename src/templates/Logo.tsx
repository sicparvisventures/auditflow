import { AppConfig } from '@/utils/AppConfig';

export const Logo = (props: {
  isTextHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'size-6',
    md: 'size-8',
    lg: 'size-10',
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
      {/* AuditFlow Logo - Clipboard with Checkmark */}
      <svg
        className={`mr-2 ${iconSize}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
      >
        {/* Clipboard base */}
        <rect
          x="4"
          y="4"
          width="16"
          height="18"
          rx="2"
          className="fill-primary"
        />
        {/* Clipboard clip */}
        <rect
          x="8"
          y="2"
          width="8"
          height="4"
          rx="1"
          className="fill-primary"
        />
        <rect
          x="9"
          y="3"
          width="6"
          height="2"
          rx="0.5"
          className="fill-background"
        />
        {/* Checkmark */}
        <path
          d="M8 12l2.5 2.5L16 9"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Flow arrow */}
        <path
          d="M8 17h5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14 17l1.5-1.5M14 17l1.5 1.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!props.isTextHidden && (
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {AppConfig.name}
        </span>
      )}
    </div>
  );
};
