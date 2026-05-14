import React from 'react';

interface ExcelImportExportProps {
  className?: string;
}

export const ExcelImportExport: React.FC<ExcelImportExportProps> = ({ className }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Excel İmport/Export</h3>
      <p className="text-gray-600">
        Excel faylları ilə import və export funksionallığı inkişaf halındadır.
      </p>
    </div>
  );
};