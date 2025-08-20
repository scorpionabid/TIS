import React from 'react';
import { Schedule } from '@/services/schedule';

interface ScheduleBuilderProps {
  scheduleId?: number;
  onSave?: (schedule: Schedule) => void;
  onCancel?: () => void;
  className?: string;
}

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({ className }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Cədvəl Quraşdırıcısı</h2>
      <p className="text-gray-600">
        Cədvəl quraşdırıcısı funksionallığı inkişaf halındadır.
      </p>
    </div>
  );
};

export default ScheduleBuilder;