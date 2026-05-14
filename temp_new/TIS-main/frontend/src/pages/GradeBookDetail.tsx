import React from 'react';
import { useParams } from 'react-router-dom';
import { GradeBookView } from '@/components/gradebook';

export default function GradeBookDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Jurnal tapılmadı</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <GradeBookView />
    </div>
  );
}
