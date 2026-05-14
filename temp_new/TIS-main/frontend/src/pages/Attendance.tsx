import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';

const Attendance: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const role = currentUser?.role;

    if (role === USER_ROLES.SCHOOLADMIN || role === USER_ROLES.SUPERADMIN) {
      navigate('/school/attendance?tab=reports', { replace: true });
      return;
    }

    navigate('/regionadmin/attendance/reports', { replace: true, state: { from: location.pathname } });
  }, [currentUser?.role, location.pathname, navigate]);

  return null;
};

export default Attendance;
