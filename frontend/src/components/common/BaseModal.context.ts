import React from 'react';
import type { BaseModalTab } from './BaseModal';

export interface BaseModalTabsContextValue {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  tabs: BaseModalTab[];
}

export const BaseModalTabsContext = React.createContext<BaseModalTabsContextValue | null>(null);
