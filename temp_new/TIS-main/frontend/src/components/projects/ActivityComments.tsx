import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { projectService } from '@/services/projects';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityCommentsProps {
  activityId: number;
}

export const ActivityComments: React.FC<ActivityCommentsProps> = ({ activityId }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const data = await projectService.getComments(activityId);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [activityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const comment = await projectService.addComment(activityId, {
        comment: newComment,
        type: 'comment',
      });
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Müzakirə və Rəylər</h3>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          {comments.length}
        </span>
      </div>

      <ScrollArea className="flex-1 pr-4 mb-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={comment.user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {comment.user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground/80">
                      {comment.user?.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {(() => {
                        const cleanDateStr = comment.created_at?.includes('.') ? comment.created_at.split('.')[0] : comment.created_at;
                        const date = cleanDateStr ? new Date(cleanDateStr) : null;
                        return date && !isNaN(date.getTime()) 
                          ? formatDistanceToNow(date, { addSuffix: true, locale: az })
                          : '-';
                      })()}
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-sm text-foreground/90 leading-relaxed shadow-sm">
                    {comment.comment}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground italic text-sm">
              Hələ rəy yoxdur. İlk rəyi siz yazın.
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="relative pt-2 border-t">
        <Textarea
          placeholder="Rəyiniz (@mentions dəstəklənir)..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px] resize-none pr-12 text-sm bg-muted/30 focus-visible:ring-primary/20"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newComment.trim() || isLoading}
          className="absolute bottom-4 right-2 w-8 h-8 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
