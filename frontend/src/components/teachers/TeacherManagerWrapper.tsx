// Teacher Manager - Standardized Component

import React from 'react';
import { SchoolTeacherManagerStandardized } from './SchoolTeacherManagerStandardized';

interface TeacherManagerWrapperProps {
  className?: string;
}

export const TeacherManagerWrapper: React.FC<TeacherManagerWrapperProps> = (props) => {
  return <SchoolTeacherManagerStandardized {...props} />;
};

export default TeacherManagerWrapper;