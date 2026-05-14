import * as React from 'react';

interface ModernMessageIconProps {
  className?: string;
  size?: number;
  animated?: boolean;
  unreadCount?: number;
}

/**
 * Modern Message Icon - Gradient animated message icon
 * Features:
 * - Gradient background
 * - Pulse animation for unread messages
 * - Badge counter
 * - Modern chat bubble design
 */
export const ModernMessageIcon: React.FC<ModernMessageIconProps> = ({
  className = '',
  size = 24,
  animated = true,
  unreadCount = 0,
}) => {
  const hasUnread = unreadCount > 0;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={hasUnread && animated ? 'animate-pulse' : ''}
      >
        <defs>
          <linearGradient id="messageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="messageGradientHover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle
          cx="12"
          cy="12"
          r="11"
          fill="url(#messageGradient)"
          opacity="0.1"
        />
        
        {/* Outer ring for unread messages */}
        {hasUnread && (
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke="url(#messageGradient)"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          >
            {animated && (
              <animate
                attributeName="r"
                values="11;13;11"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        )}
        
        {/* Main message bubble */}
        <path
          d="M20 12C20 16.4183 16.4183 20 12 20C10.575 20 9.2425 19.625 8.0875 18.9625L4 20L5.0375 15.9125C4.375 14.7575 4 13.425 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z"
          fill="url(#messageGradient)"
          filter={hasUnread ? 'url(#glow)' : undefined}
        />
        
        {/* Message lines */}
        <rect x="8" y="10" width="8" height="1.5" rx="0.75" fill="white" opacity="0.9" />
        <rect x="8" y="13" width="6" height="1.5" rx="0.75" fill="white" opacity="0.7" />
        
        {/* Typing indicator dots for unread */}
        {hasUnread && (
          <>
            <circle cx="14" cy="16" r="1" fill="white" opacity="0.9">
              {animated && (
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0s"
                />
              )}
            </circle>
            <circle cx="12" cy="16" r="1" fill="white" opacity="0.9">
              {animated && (
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
              )}
            </circle>
            <circle cx="10" cy="16" r="1" fill="white" opacity="0.9">
              {animated && (
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
              )}
            </circle>
          </>
        )}
      </svg>

      {/* Unread badge */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/30 px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
};

export default ModernMessageIcon;
