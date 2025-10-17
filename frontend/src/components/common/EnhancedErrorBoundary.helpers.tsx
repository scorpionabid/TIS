import React from 'react';
import EnhancedErrorBoundary, { Props } from './EnhancedErrorBoundary';

export const PageErrorBoundary: React.FC<Omit<Props, 'level'> & { name: string }> = (props) => (
  <EnhancedErrorBoundary {...props} level="page" enableRecovery={true} />
);

export const SectionErrorBoundary: React.FC<Omit<Props, 'level'> & { name: string }> = (props) => (
  <EnhancedErrorBoundary {...props} level="section" enableRecovery={true} />
);

export const ComponentErrorBoundary: React.FC<Omit<Props, 'level'> & { name: string }> = (props) => (
  <EnhancedErrorBoundary {...props} level="component" enableRecovery={true} />
);
