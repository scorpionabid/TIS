import React from 'react';
import type { StatusTab } from '../hooks/useLinkState';

interface LinkStatusTabsProps {
  statusTab: StatusTab;
  setStatusTab: (tab: StatusTab) => void;
}

export const LinkStatusTabs: React.FC<LinkStatusTabsProps> = ({
  statusTab,
  setStatusTab,
}) => {
  return (
    <div className="flex space-x-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => setStatusTab('active')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          statusTab === 'active'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Aktiv
      </button>
      <button
        onClick={() => setStatusTab('disabled')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          statusTab === 'disabled'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Disabled
      </button>
      <button
        onClick={() => setStatusTab('all')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          statusTab === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Hamısı
      </button>
    </div>
  );
};
