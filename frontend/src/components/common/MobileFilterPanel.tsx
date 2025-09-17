import React from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from '@/contexts/LayoutContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Filter } from 'lucide-react';

interface MobileFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  onApply?: () => void;
  onReset?: () => void;
  className?: string;
}

export const MobileFilterPanel: React.FC<MobileFilterPanelProps> = ({
  isOpen,
  onClose,
  title = "Filterlər",
  children,
  onApply,
  onReset,
  className
}) => {
  const { isMobile } = useLayout();

  if (isMobile) {
    return (
      <>
        {/* Mobile backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}

        {/* Mobile filter panel using existing CSS classes */}
        <div
          className={cn(
            "filter-panel-mobile",
            !isOpen && "closed",
            className
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {children}
          </div>

          <div className="flex gap-2">
            {onReset && (
              <Button
                variant="outline"
                onClick={onReset}
                className="flex-1"
              >
                Təmizlə
              </Button>
            )}
            {onApply && (
              <Button
                onClick={() => {
                  onApply();
                  onClose();
                }}
                className="flex-1"
              >
                Tətbiq et
              </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Desktop - simple card
  if (!isOpen) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {children}
        </div>

        <div className="flex gap-2 mt-4">
          {onReset && (
            <Button
              variant="outline"
              onClick={onReset}
              className="flex-1"
            >
              Təmizlə
            </Button>
          )}
          {onApply && (
            <Button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="flex-1"
            >
              Tətbiq et
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile filter trigger button
export const MobileFilterTrigger: React.FC<{
  onClick: () => void;
  activeFilters?: number;
  className?: string;
}> = ({ onClick, activeFilters, className }) => {
  const { isMobile } = useLayout();

  if (!isMobile) return null;

  return (
    <Button
      onClick={onClick}
      className={cn("filter-trigger-mobile", className)}
      size="icon"
    >
      <Filter className="h-5 w-5" />
      {activeFilters && activeFilters > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs font-medium text-primary-foreground flex items-center justify-center">
          {activeFilters}
        </span>
      )}
    </Button>
  );
};