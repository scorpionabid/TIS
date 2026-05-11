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
    <div className="w-full flex flex-col gap-8 md:gap-12 pb-24 pt-2 md:pt-4 px-3 sm:px-4 lg:px-6">
      {showGreeting && <GreetingHeader />}
      
      <div className="w-full">
        {children}
      </div>

      {showQuickActions && <QuickActionsGrid />}
    </div>
  );
};
