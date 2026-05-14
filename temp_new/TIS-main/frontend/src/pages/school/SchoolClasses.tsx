import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GradeManager } from '@/components/grades/GradeManager';

/**
 * School Classes Management Page
 *
 * Uses GradeManager with simplified dialog
 */
const SchoolClasses: React.FC = () => {
  const navigate = useNavigate();
  return (
    <GradeManager
      onAfterCreate={() => navigate('/school/curriculum-plan?tab=grades')}
    />
  );
};

export default SchoolClasses;
