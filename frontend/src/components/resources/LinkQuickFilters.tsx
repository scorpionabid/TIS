import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { LinkFilters } from '@/components/resources/LinkFilterPanel';

interface LinkQuickFiltersProps {
  filters: LinkFilters;
  onChange: (updater: (prev: LinkFilters) => LinkFilters) => void;
}

const getToday = () => new Date().toISOString().split('T')[0];
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

export function toggleRecentLinksFilter(prev: LinkFilters): LinkFilters {
  const rangeStart = getDaysAgo(7);
  const rangeEnd = getToday();
  const isActive =
    prev.date_from === rangeStart &&
    (prev.date_to === rangeEnd || !prev.date_to);

  if (isActive) {
    const { date_from, date_to, ...rest } = prev;
    return rest;
  }

  return {
    ...prev,
    date_from: rangeStart,
    date_to: rangeEnd,
  };
}

export function toggleFeaturedLinksFilter(prev: LinkFilters): LinkFilters {
  if (prev.is_featured) {
    const { is_featured, ...rest } = prev;
    return rest;
  }
  return {
    ...prev,
    is_featured: true,
  };
}

export function toggleMyLinksFilter(prev: LinkFilters): LinkFilters {
  if (prev.my_links) {
    const { my_links, ...rest } = prev;
    return rest;
  }
  return {
    ...prev,
    my_links: true,
  };
}

export function LinkQuickFilters({ filters, onChange }: LinkQuickFiltersProps) {
  const rangeStart = getDaysAgo(7);
  const rangeEnd = getToday();

  const isRecentActive =
    filters.date_from === rangeStart &&
    (filters.date_to === rangeEnd || !filters.date_to);
  const isFeaturedActive = Boolean(filters.is_featured);
  const isMineActive = Boolean(filters.my_links);

  const quickActions = useMemo(
    () => [
      {
        id: 'recent',
        label: 'Son 7 gün',
        active: isRecentActive,
        handler: () => onChange((prev) => toggleRecentLinksFilter(prev)),
      },
      {
        id: 'featured',
        label: 'Tanıtılmış Linklər',
        active: isFeaturedActive,
        handler: () => onChange((prev) => toggleFeaturedLinksFilter(prev)),
      },
      {
        id: 'mine',
        label: 'Mənim Linklərim',
        active: isMineActive,
        handler: () => onChange((prev) => toggleMyLinksFilter(prev)),
      },
    ],
    [isRecentActive, isFeaturedActive, isMineActive, onChange]
  );

  return (
    <div className="flex flex-wrap gap-2">
      {quickActions.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant={action.active ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={action.handler}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
