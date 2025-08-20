import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useScheduleBuilder } from './hooks/useScheduleBuilder';
import { ScheduleControls } from './ScheduleControls';
import { ScheduleGrid } from './ScheduleGrid';
import { ConflictIndicator } from './ConflictIndicator';
import { ScheduleTemplateSelector } from './ScheduleTemplateSelector';
import { ScheduleSettings } from './ScheduleSettings';
import { SlotEditModal } from './SlotEditModal';
import { cn } from '@/lib/utils';

interface ScheduleBuilderProps {
  scheduleId?: number;
  onSave?: (schedule: any) => void;
  onCancel?: () => void;
  className?: string;
}

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  scheduleId,
  onSave,
  onCancel,
  className
}) => {
  const {
    // State
    scheduleData,
    slots,
    conflicts,
    selectedSlot,
    isEditingSlot,
    activeTab,
    selectedTemplate,
    
    // Data
    templates,
    rooms,
    mockClasses,
    mockSubjects,
    mockTeachers,
    timeSlots,
    daysOfWeek,
    
    // Loading states
    scheduleLoading,
    isSaving,
    isCreatingFromTemplate,
    
    // Actions
    setScheduleData,
    setActiveTab,
    setSelectedTemplate,
    setSelectedSlot,
    setIsEditingSlot,
    handleSave,
    handleCreateFromTemplate,
    addSlot,
    updateSlot,
    removeSlot,
    getSlotForCell
  } = useScheduleBuilder({ scheduleId, onSave });

  if (scheduleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Dərs cədvəli yüklənir...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Controls */}
      <ScheduleControls
        scheduleData={scheduleData}
        conflicts={conflicts}
        isSaving={isSaving}
        scheduleId={scheduleId}
        onScheduleDataChange={setScheduleData}
        onSave={handleSave}
        onCancel={onCancel}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder">Cədvəl Qurucusu</TabsTrigger>
          <TabsTrigger value="conflicts">
            Konfliktlər
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {conflicts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">Şablonlar</TabsTrigger>
          <TabsTrigger value="settings">Tənzimləmələr</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <ScheduleGrid
            slots={slots}
            conflicts={conflicts}
            timeSlots={timeSlots}
            daysOfWeek={daysOfWeek}
            onSlotClick={(slot) => {
              setSelectedSlot(slot);
              setIsEditingSlot(true);
            }}
            onEmptySlotClick={addSlot}
          />
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <ConflictIndicator conflicts={conflicts} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <ScheduleTemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            isCreatingFromTemplate={isCreatingFromTemplate}
            onTemplateSelect={setSelectedTemplate}
            onCreateFromTemplate={handleCreateFromTemplate}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ScheduleSettings />
        </TabsContent>
      </Tabs>

      {/* Slot Edit Modal */}
      {isEditingSlot && selectedSlot && (
        <SlotEditModal
          slot={selectedSlot}
          classes={mockClasses}
          subjects={mockSubjects}
          teachers={mockTeachers}
          rooms={rooms}
          timeSlots={timeSlots}
          onSave={updateSlot}
          onDelete={() => removeSlot(selectedSlot.id)}
          onCancel={() => {
            setSelectedSlot(null);
            setIsEditingSlot(false);
          }}
        />
      )}
    </div>
  );
};