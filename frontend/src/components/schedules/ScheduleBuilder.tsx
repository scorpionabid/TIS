// Re-export the new modular schedule builder
export { ScheduleBuilder as default } from './ScheduleBuilderRefactored';

// Keep the old interface for backward compatibility
import { Schedule } from '@/services/schedule';

interface ScheduleBuilderProps {
  scheduleId?: number;
  onSave?: (schedule: Schedule) => void;
  onCancel?: () => void;
  className?: string;
}

// Export the refactored ScheduleBuilder for backward compatibility
export { ScheduleBuilder } from './ScheduleBuilderRefactored';