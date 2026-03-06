import React from 'react';

interface PsixoloquDashboardProps {
  className?: string;
}

export const PsixoloquDashboard: React.FC<PsixoloquDashboardProps> = ({ className }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Psixoloq Dashboard</h2>
      <p className="text-gray-600">
        Psixoloq dashboard funksionallığı inkişaf halındadır.
      </p>
    </div>
  );
};