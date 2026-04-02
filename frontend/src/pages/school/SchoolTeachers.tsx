import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SchoolTeacherManagerStandardized } from '@/components/teachers/SchoolTeacherManagerStandardized';

const SchoolTeachers: React.FC = () => {
  const navigate = useNavigate();
  return (
    <SchoolTeacherManagerStandardized
      onAfterCreate={() => navigate('/school/curriculum-plan?tab=workload')}
    />
  );
};

export default SchoolTeachers;