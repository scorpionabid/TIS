import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

const normalizeTab = (tabValue?: string | null): 'links' | 'documents' | 'folders' => {
  if (tabValue === 'documents') return 'documents';
  if (tabValue === 'folders') return 'folders';
  return 'links';
};

export default function ResourcesRedirect() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const nextTab = normalizeTab(tabParam);
  const params = new URLSearchParams(searchParams);
  params.delete('tab');
  const searchString = params.toString();
  const targetPath = `/resources/${nextTab}${searchString ? `?${searchString}` : ''}`;

  return <Navigate to={targetPath} replace />;
}
