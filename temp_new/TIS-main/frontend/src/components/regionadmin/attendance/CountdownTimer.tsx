import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  deadline: string; // "10:00" veya "14:30"
  submittedAt?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  isExpired: boolean;
  isUrgent: boolean; // 15 dəq və ya az qalıbsa
  isNear: boolean;  // 30 dəq və ya az qalıbsa
}

export function CountdownTimer({
  deadline,
  submittedAt,
  className,
  size = 'md',
  showIcon = true,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline, submittedAt)
  );

  // Her saniyə yenilə
  useEffect(() => {
    // Əgər artıq doldurulubsa, yeniləməyə ehtiyac yoxdur
    if (submittedAt) {
      setTimeRemaining(calculateTimeRemaining(deadline, submittedAt));
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadline, submittedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, submittedAt]);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Doldurulubsa
  if (submittedAt) {
    const submittedDate = new Date(submittedAt);
    const deadlineDate = getDeadlineDate(deadline);
    const isLate = submittedDate > deadlineDate;
    const diffMinutes = Math.floor(
      (submittedDate.getTime() - deadlineDate.getTime()) / 60000
    );

    if (isLate) {
      return (
        <div className={cn('inline-flex items-center gap-1.5 text-red-600 font-medium', sizeClasses[size], className)}>
          {showIcon && <AlertCircle className={cn(iconSizes[size], 'animate-pulse')} />}
          <span>+{Math.abs(diffMinutes)} dəq gecikmə</span>
        </div>
      );
    }

    return (
      <div className={cn('inline-flex items-center gap-1.5 text-green-600 font-medium', sizeClasses[size], className)}>
        {showIcon && <CheckCircle2 className={iconSizes[size]} />}
        <span>Vaxtında</span>
      </div>
    );
  }

  // Vaxt keçibsə
  if (timeRemaining.isExpired) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-red-600 font-semibold', sizeClasses[size], className)}>
        {showIcon && <AlertCircle className={cn(iconSizes[size], 'animate-pulse')} />}
        <span>Vaxt keçmiş!</span>
      </div>
    );
  }

  // Təcili (15 dəq və ya az)
  if (timeRemaining.isUrgent) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-amber-600 font-semibold', sizeClasses[size], className)}>
        {showIcon && <Clock className={cn(iconSizes[size], 'animate-pulse')} />}
        <span>
          {timeRemaining.minutes > 0 && `${timeRemaining.minutes} dəq `}
          {timeRemaining.seconds > 0 && `${timeRemaining.seconds} san`}
        </span>
      </div>
    );
  }

  // Normal geri sayım
  return (
    <div className={cn('inline-flex items-center gap-1.5 text-blue-600 font-medium', sizeClasses[size], className)}>
      {showIcon && <Clock className={iconSizes[size]} />}
      <span>
        {timeRemaining.hours > 0 && `${timeRemaining.hours} saat `}
        {timeRemaining.minutes > 0 && `${timeRemaining.minutes} dəq`}
        {timeRemaining.hours === 0 && timeRemaining.minutes === 0 && `${timeRemaining.seconds} san`}
      </span>
    </div>
  );
}

// Yardımçı funksiyalar
function getDeadlineDate(deadline: string): Date {
  const [hours, minutes] = deadline.split(':').map(Number);
  const now = new Date();
  const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  return deadlineDate;
}

function calculateTimeRemaining(deadline: string, submittedAt?: string | null): TimeRemaining {
  // Əgər doldurulubsa
  if (submittedAt) {
    const submittedDate = new Date(submittedAt);
    const deadlineDate = getDeadlineDate(deadline);
    const diffMs = deadlineDate.getTime() - submittedDate.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);

    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMinutes,
      isExpired: diffMs < 0,
      isUrgent: false,
      isNear: false,
    };
  }

  const now = new Date();
  const deadlineDate = getDeadlineDate(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);

  const isExpired = diffMs <= 0;
  const isUrgent = !isExpired && totalMinutes <= 15;
  const isNear = !isExpired && totalMinutes <= 30;

  if (isExpired) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMinutes: 0,
      isExpired: true,
      isUrgent: false,
      isNear: false,
    };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((diffMs % 60000) / 1000);

  return {
    hours,
    minutes,
    seconds,
    totalMinutes,
    isExpired,
    isUrgent,
    isNear,
  };
}

// Deadline badge komponenti
interface DeadlineBadgeProps {
  deadline: string;
  className?: string;
}

export function DeadlineBadge({ deadline, className }: DeadlineBadgeProps) {
  const isMorning = deadline === '10:00';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        isMorning
          ? 'bg-blue-100 text-blue-800'
          : 'bg-orange-100 text-orange-800',
        className
      )}
    >
      {deadline}
    </span>
  );
}
