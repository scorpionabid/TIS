import { useEffect, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';

interface MessagePreviewCardProps {
  message: Message | null;
  isVisible: boolean;
  onClose: () => void;
  onClick: () => void;
}

/**
 * Message Preview Card - Floating notification card for new messages
 * Dark blue design matching the screenshot
 */
export function MessagePreviewCard({ 
  message, 
  isVisible, 
  onClose, 
  onClick 
}: MessagePreviewCardProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-dismiss progress
  useEffect(() => {
    if (!isVisible || isPaused) return;

    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, isPaused, onClose]);

  // Reset progress when new message arrives
  useEffect(() => {
    if (isVisible) {
      setProgress(100);
    }
  }, [message, isVisible]);

  if (!isVisible || !message) return null;

  const senderName = message.sender?.name || 'Unknown';
  const messagePreview = message.body?.substring(0, 50) + (message.body?.length > 50 ? '...' : '') || 'Yeni mesaj';
  const timeAgo = formatTimeAgo(message.created_at);

  return (
    <div
      className={cn(
        "fixed right-24 bottom-24 sm:right-24 sm:bottom-6 z-[9998]",
        "w-72 rounded-xl overflow-hidden",
        "bg-gradient-to-br from-[#1e3a5f] to-[#162d4a]",
        "shadow-2xl shadow-black/30",
        "border border-white/10",
        "animate-in slide-in-from-bottom-2 slide-in-from-right-2 duration-300",
        "cursor-pointer"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={onClick}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div 
          className="h-full bg-blue-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{senderName}</span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/80 text-white rounded">
            Gələn
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-3 h-3 text-white/70" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        <p className="text-sm font-medium text-white mb-1">
          {messagePreview}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">{timeAgo}</span>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </div>
      </div>

      {/* Avatar */}
      <div className="absolute -bottom-3 -right-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-[#1e3a5f]">
          {getInitials(senderName)}
        </div>
      </div>
    </div>
  );
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'İndi';
  if (diffMins < 60) return `${diffMins} dəq əvvəl`;
  if (diffHours < 24) return `${diffHours} saat əvvəl`;
  if (diffDays === 1) return 'Dünən';
  return `${diffDays} gün əvvəl`;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export default MessagePreviewCard;
