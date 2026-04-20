import React from 'react';
import { Clock, Lock } from 'lucide-react';
import { AttendanceSession } from '../types';

interface ModernSessionTabsProps {
  activeSession: AttendanceSession;
  onSessionChange: (session: AttendanceSession) => void;
  morningHasData: boolean;
  eveningHasData: boolean;
  morningDirty: boolean;
  eveningDirty: boolean;
  eveningLocked?: boolean;
  eveningAllowedAt?: string | null;
}

const ModernSessionTabs: React.FC<ModernSessionTabsProps> = ({
  activeSession,
  onSessionChange,
  morningHasData,
  eveningHasData,
  morningDirty,
  eveningDirty,
  eveningLocked = false,
  eveningAllowedAt = null,
}) => {
  const getTabStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-white text-[#1a237e] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]';
    }
    return 'bg-[#e0e0e0] text-gray-500 hover:bg-[#d0d0d0]';
  };

  const getIndicator = (hasData: boolean, isDirty: boolean) => {
    if (isDirty) return <span className="ml-1.5 w-2 h-2 rounded-full bg-yellow-400" />;
    if (hasData) return <span className="ml-1.5 w-2 h-2 rounded-full bg-green-400" />;
    return null;
  };

  return (
    <div className="flex">
      <button
        onClick={() => onSessionChange('morning')}
        className={`
          flex-1 sm:flex-none px-6 sm:px-8 py-3 text-sm font-semibold
          rounded-t-2xl transition-all duration-300
          flex items-center justify-center gap-2
          ${getTabStyle(activeSession === 'morning')}
        `}
      >
        <Clock className="h-4 w-4" />
        İlk dərs
        {getIndicator(morningHasData, morningDirty)}
      </button>
      <button
        onClick={() => onSessionChange('evening')}
        className={`
          flex-1 sm:flex-none px-6 sm:px-8 py-3 text-sm font-semibold
          rounded-t-2xl transition-all duration-300
          flex flex-col items-center justify-center gap-0.5
          ${getTabStyle(activeSession === 'evening')}
        `}
      >
        <span className="flex items-center gap-2">
          {eveningLocked ? <Lock className="h-4 w-4 text-amber-500" /> : <Clock className="h-4 w-4" />}
          Son dərs
          {!eveningLocked && getIndicator(eveningHasData, eveningDirty)}
        </span>
        {eveningLocked && eveningAllowedAt && (
          <span className="text-[10px] font-medium text-amber-500 leading-none">
            {eveningAllowedAt}-dən sonra
          </span>
        )}
      </button>
    </div>
  );
};

export default ModernSessionTabs;
