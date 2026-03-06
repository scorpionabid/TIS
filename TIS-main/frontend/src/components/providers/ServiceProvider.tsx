import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { schoolAdminService } from '@/services/schoolAdmin';
import { superAdminService } from '@/services/superAdmin';

interface ServiceContextType {
  service: typeof schoolAdminService | typeof superAdminService;
  isSuper: boolean;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  
  const serviceContext: ServiceContextType = {
    service: currentUser?.role === 'superadmin' ? superAdminService : schoolAdminService,
    isSuper: currentUser?.role === 'superadmin',
  };

  return (
    <ServiceContext.Provider value={serviceContext}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useService = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};

export default ServiceProvider;