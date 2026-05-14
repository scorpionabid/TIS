import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const tabBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-600',
        primary: 'bg-blue-100 text-blue-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        danger: 'bg-red-100 text-red-700',
        purple: 'bg-purple-100 text-purple-700',
        orange: 'bg-orange-100 text-orange-700',
      },
      size: {
        default: 'px-2 py-0.5 min-w-[20px]',
        sm: 'px-1.5 py-0.5 text-[10px] min-w-[16px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const tabIndicatorVariants = cva(
  'absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-gray-400',
        primary: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        danger: 'bg-red-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

export interface ModernTabItem {
  key: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'orange';
  description?: string;
}

interface ModernTabsProps {
  tabs: ModernTabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
  showCounts?: boolean;
}

export const ModernTabs: React.FC<ModernTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
  showCounts = true,
}) => {
  const getTabVariant = (tab: ModernTabItem, isActive: boolean): string => {
    const baseClasses = cn(
      'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
      'cursor-pointer select-none whitespace-nowrap',
      'hover:shadow-md active:scale-[0.98]',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      isActive 
        ? 'shadow-lg transform -translate-y-0.5' 
        : 'hover:bg-white/50'
    );

    if (!isActive) {
      return cn(baseClasses, 'text-gray-600 hover:text-gray-900');
    }

    const variantStyles = {
      default: 'bg-white text-gray-900 ring-2 ring-gray-200 shadow-gray-200/50',
      primary: 'bg-blue-50 text-blue-700 ring-2 ring-blue-200 shadow-blue-200/50',
      success: 'bg-green-50 text-green-700 ring-2 ring-green-200 shadow-green-200/50',
      warning: 'bg-yellow-50 text-yellow-700 ring-2 ring-yellow-200 shadow-yellow-200/50',
      danger: 'bg-red-50 text-red-700 ring-2 ring-red-200 shadow-red-200/50',
      purple: 'bg-purple-50 text-purple-700 ring-2 ring-purple-200 shadow-purple-200/50',
      orange: 'bg-orange-50 text-orange-700 ring-2 ring-orange-200 shadow-orange-200/50',
    };

    return cn(baseClasses, variantStyles[tab.variant || 'default']);
  };

  const getCountBadgeVariant = (tabVariant?: string): any => {
    const variantMap: Record<string, any> = {
      default: 'default',
      primary: 'primary',
      success: 'success',
      warning: 'warning',
      danger: 'danger',
      purple: 'purple',
      orange: 'orange',
    };
    return variantMap[tabVariant || 'default'] || 'default';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Scroll Container */}
      <div className="relative">
        <div 
          className={cn(
            'flex items-center gap-2 p-2 rounded-xl',
            'bg-gray-100/80 backdrop-blur-sm',
            'overflow-x-auto scrollbar-hide',
            'lg:overflow-visible'
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <motion.button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={getTabVariant(tab, isActive)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                layout
              >
                {/* Icon */}
                {Icon && (
                  <span className="flex-shrink-0">
                    <Icon className={cn(
                      'w-4 h-4 transition-colors duration-200',
                      isActive ? 'opacity-100' : 'opacity-60'
                    )} />
                  </span>
                )}

                {/* Label */}
                <span className="font-semibold">{tab.label}</span>

                {/* Count Badge */}
                {showCounts && tab.count !== undefined && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                      tabBadgeVariants({ 
                        variant: isActive ? getCountBadgeVariant(tab.variant) : 'default',
                        size: 'default'
                      }),
                      isActive && 'ring-1 ring-white/50'
                    )}
                  >
                    {tab.count}
                  </motion.span>
                )}

                {/* Active Indicator Line */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className={cn(
                      'absolute -bottom-1 left-2 right-2 h-1 rounded-full',
                      tabIndicatorVariants({ variant: tab.variant || 'primary' })
                    )}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Fade indicators for mobile scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-100/50 to-transparent pointer-events-none lg:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-gray-100/50 to-transparent pointer-events-none lg:hidden" />
      </div>
    </div>
  );
};

// Compact version for smaller spaces
export const ModernTabsCompact: React.FC<ModernTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
  showCounts = true,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                'whitespace-nowrap',
                isActive
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {showCounts && tab.count !== undefined && (
                <span className={cn(
                  'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[16px]',
                  isActive
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-gray-200/50 text-gray-600'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModernTabs;
