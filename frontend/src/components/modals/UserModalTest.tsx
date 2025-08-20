import React, { useState } from 'react';
import { UserModal } from './UserModal';
import { Button } from '@/components/ui/button';

// Test component to verify the enhanced UserModal works
export function UserModalTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSave = async (userData: any) => {
    console.log('User data to save:', userData);
    // Mock save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Enhanced User Modal Test</h2>
      <p className="mb-4 text-gray-600">
        Bu test üçün modal-ı açın və rol seçdikdən sonra müəllim/şagird tab-larının 
        aktivləşdiyini yoxlayın.
      </p>
      
      <Button onClick={() => setIsModalOpen(true)}>
        Yeni İstifadəçi Əlavə Et
      </Button>

      <UserModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}