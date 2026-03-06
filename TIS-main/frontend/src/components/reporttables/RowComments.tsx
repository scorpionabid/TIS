/**
 * RowComments Component - Add and display comments on report table rows
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, MoreVertical, Trash2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

export interface RowComment {
  id: number;
  response_id: number;
  row_index: number;
  author_id: number;
  author_name: string;
  author_role?: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
}

interface RowCommentsProps {
  tableId: number;
  responseId: number;
  rowIndex: number;
  institutionName: string;
  trigger?: React.ReactNode;
}

// Mock API service for comments - replace with actual API when ready
const commentService = {
  async getComments(tableId: number, responseId: number, rowIndex: number): Promise<RowComment[]> {
    // TODO: Replace with actual API call
    // return apiClient.get(`report-tables/${tableId}/responses/${responseId}/rows/${rowIndex}/comments`);
    return [];
  },

  async addComment(tableId: number, responseId: number, rowIndex: number, content: string): Promise<RowComment> {
    // TODO: Replace with actual API call
    // return apiClient.post(`report-tables/${tableId}/responses/${responseId}/rows/${rowIndex}/comments`, { content });
    return {
      id: Date.now(),
      response_id: responseId,
      row_index: rowIndex,
      author_id: 1,
      author_name: 'Admin',
      author_role: 'region_admin',
      content,
      created_at: new Date().toISOString(),
    };
  },

  async deleteComment(tableId: number, commentId: number): Promise<void> {
    // TODO: Replace with actual API call
    // await apiClient.delete(`report-tables/${tableId}/comments/${commentId}`);
  },

  async updateComment(tableId: number, commentId: number, content: string): Promise<RowComment> {
    // TODO: Replace with actual API call
    return {
      id: commentId,
      response_id: 1,
      row_index: 0,
      author_id: 1,
      author_name: 'Admin',
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: true,
    };
  },
};

export function RowComments({ 
  tableId, 
  responseId, 
  rowIndex, 
  institutionName,
  trigger 
}: RowCommentsProps) {
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const queryClient = useQueryClient();
  const queryKey = ['row-comments', tableId, responseId, rowIndex];

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => commentService.getComments(tableId, responseId, rowIndex),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (content: string) => 
      commentService.addComment(tableId, responseId, rowIndex, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setNewComment('');
      toast.success('Şərh əlavə edildi');
    },
    onError: () => toast.error('Şərh əlavə edilə bilmədi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => 
      commentService.deleteComment(tableId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Şərh silindi');
    },
    onError: () => toast.error('Şərh silinə bilmədi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => 
      commentService.updateComment(tableId, id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingCommentId(null);
      setEditContent('');
      toast.success('Şərh yeniləndi');
    },
    onError: () => toast.error('Şərh yenilənə bilmədi'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addMutation.mutate(newComment.trim());
    }
  };

  const handleEdit = (comment: RowComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleUpdate = (commentId: number) => {
    if (editContent.trim()) {
      updateMutation.mutate({ id: commentId, content: editContent.trim() });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'region_admin': return 'Region Admin';
      case 'sector_admin': return 'Sektor Admin';
      case 'school_admin': return 'Məktəb';
      default: return 'İstifadəçi';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'region_admin': return 'bg-blue-100 text-blue-700';
      case 'sector_admin': return 'bg-green-100 text-green-700';
      case 'school_admin': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1">
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {comments.length}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Sətir şərhləri
            <span className="text-sm font-normal text-gray-500">
              ({institutionName} - Sətir #{rowIndex + 1})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Hələ şərh yoxdur</p>
              <p className="text-sm">İlk şərhi siz yazın</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={getRoleColor(comment.author_role)}>
                      {getInitials(comment.author_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {getRoleLabel(comment.author_role)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {format(new Date(comment.created_at), 'dd MMM, HH:mm', { locale: az })}
                      </span>
                      {comment.is_edited && (
                        <span className="text-xs text-gray-400">(dəyişdirilib)</span>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditContent('');
                            }}
                          >
                            <X className="h-3 w-3 mr-1" /> Ləğv
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(comment.id)}
                            disabled={updateMutation.isPending}
                          >
                            <Send className="h-3 w-3 mr-1" /> Yadda saxla
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    )}
                  </div>

                  {editingCommentId !== comment.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(comment)}>
                          Düzəliş et
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Şərh yazın..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1 text-sm resize-none"
            />
            <Button 
              type="submit" 
              size="sm" 
              className="self-end"
              disabled={!newComment.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RowComments;
