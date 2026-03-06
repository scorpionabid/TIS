import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckSquare } from 'lucide-react';
import { ManagerCustomLogic } from './types';

interface GenericBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: ManagerCustomLogic<any>['bulkActions'];
  className?: string;
}

export function GenericBulkActions({
  selectedCount,
  onClearSelection,
  actions = [],
  className,
}: GenericBulkActionsProps) {
  
  if (selectedCount === 0) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>{selectedCount} element seçildi</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4 mr-1" />
              Seçimi təmizlə
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {actions.map(action => (
              <Button
                key={action.key}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}