import React from 'react';

interface ScheduleTemplateProps {
  className?: string;
}

export const ScheduleTemplate: React.FC<ScheduleTemplateProps> = ({ className }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Cədvəl Şablonu</h2>
      <p className="text-gray-600">
        Cədvəl şablonu funksionallığı inkişaf halındadır.
      </p>
    </div>
  );
};

export default ScheduleTemplate;