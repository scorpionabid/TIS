import React from 'react';
import { Clock } from 'lucide-react';
import { AttendanceSession } from '../types';

interface ModernSessionTabsProps {
  activeSession: AttendanceSession;
  onSessionChange: (session: AttendanceSession) => void;
  morningHasData: boolean;
  eveningHasData: boolean;
  morningDirty: boolean;
  eveningDirty: boolean;
}

const ModernSessionTabs: React.FC<ModernSessionTabsProps> = ({
  activeSession,
  onSessionChange,
  morningHasData,
  eveningHasData,
  morningDirty,
  eveningDirty,
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
          flex items-center justify-center gap-2
          ${getTabStyle(activeSession === 'evening')}
        `}
      >
        <Clock className="h-4 w-4" />
        Son dərs
        {getIndicator(eveningHasData, eveningDirty)}
      </button>
    </div>
  );
};

export default ModernSessionTabs;
