import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SidebarPreferences as SidebarPreferencesType, SidebarBehavior, SidebarPanel } from '@/types/sidebar';
import { MousePointer, Hand, Settings, Briefcase } from 'lucide-react';

interface SidebarPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: SidebarPreferencesType;
  onPreferencesChange: (preferences: SidebarPreferencesType) => void;
  onSave: () => void;
  onReset: () => void;
}

export const SidebarPreferences: React.FC<SidebarPreferencesProps> = ({
  open,
  onOpenChange,
  preferences,
  onPreferencesChange,
  onSave,
  onReset,
}) => {
  const handleBehaviorChange = (behavior: SidebarBehavior) => {
    onPreferencesChange({
      ...preferences,
      behavior,
    });
  };

  const handlePanelChange = (panel: SidebarPanel) => {
    onPreferencesChange({
      ...preferences,
      activePanel: panel,
    });
  };

  const handleSwitchChange = (key: keyof SidebarPreferencesType) => (checked: boolean) => {
    onPreferencesChange({
      ...preferences,
      [key]: checked,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-medium">Tənzimləmələr</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Panel */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Aktiv Panel</Label>
            <RadioGroup
              value={preferences.activePanel}
              onValueChange={handlePanelChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="work" id="work" className="h-4 w-4" />
                <Label htmlFor="work" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Briefcase className="h-3 w-3" />
                  İş Paneli
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="management" id="management" className="h-4 w-4" />
                <Label htmlFor="management" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Settings className="h-3 w-3" />
                  İdarə Paneli
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Behavior Mode */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Davranış</Label>
            <RadioGroup
              value={preferences.behavior}
              onValueChange={handleBehaviorChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" className="h-4 w-4" />
                <Label htmlFor="auto" className="flex items-center gap-2 cursor-pointer text-sm">
                  <MousePointer className="h-3 w-3" />
                  Avtomatik
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" className="h-4 w-4" />
                <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Hand className="h-3 w-3" />
                  Manuel
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Həmişə açıq</Label>
              <Switch
                checked={preferences.keepAlwaysExpanded}
                onCheckedChange={handleSwitchChange('keepAlwaysExpanded')}
                className="h-5 w-9"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Başlanğıcda açıq</Label>
              <Switch
                checked={preferences.defaultExpanded}
                onCheckedChange={handleSwitchChange('defaultExpanded')}
                className="h-5 w-9"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Vəziyyəti saxla</Label>
              <Switch
                checked={preferences.persistState}
                onCheckedChange={handleSwitchChange('persistState')}
                className="h-5 w-9"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onReset} 
            className="flex-1 h-8 text-xs"
          >
            Sıfırla
          </Button>
          <Button 
            onClick={onSave} 
            className="flex-1 h-8 text-xs"
          >
            Saxla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};