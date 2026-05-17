import React from 'react';
import { GreetingHeader } from "./GreetingHeader";
import { QuickActionsGrid } from "./QuickActionsGrid";

interface ModernDashboardWrapperProps {
  children: React.ReactNode;
  showGreeting?: boolean;
  showQuickActions?: boolean;
}

export const ModernDashboardWrapper = ({ 
  children, 
  showGreeting = true, 
  showQuickActions = true 
}: ModernDashboardWrapperProps) => {
  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 md:gap-8 lg:gap-12 pb-12 sm:pb-16 md:pb-24 pt-1 sm:pt-2 md:pt-4 px-2 sm:px-3 md:px-4 lg:px-6">
      {showGreeting && <GreetingHeader />}
      
      <div className="w-full">
        {children}
      </div>

      {showQuickActions && <QuickActionsGrid />}
    </div>
  );
};
