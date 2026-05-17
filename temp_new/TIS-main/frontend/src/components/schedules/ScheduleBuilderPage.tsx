import React from 'react';
import { ScheduleBuilder } from './ScheduleBuilder';
import { Schedule } from './ScheduleBuilder';

const ScheduleBuilderPage: React.FC = () => {
  const handleScheduleSave = (schedule: Schedule) => {
    // Handle schedule save - redirect or show success message
    console.log('Schedule saved:', schedule);
    // You might want to redirect to schedules list or show a success message
  };

  const handleCancel = () => {
    // Handle cancel - redirect back to schedules list
    window.history.back();
  };

  return (
    <div className="container mx-auto py-6">
      <ScheduleBuilder
        onSave={handleScheduleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ScheduleBuilderPage;