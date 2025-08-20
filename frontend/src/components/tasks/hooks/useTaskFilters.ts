import { useState, useMemo } from 'react';
import { SchoolTask, SchoolTaskFilters } from '@/services/schoolAdmin';

export const useTaskFilters = (tasks: SchoolTask[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SchoolTaskFilters>({
    page: 1,
    per_page: 50,
  });
  const [selectedTab, setSelectedTab] = useState('all');

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTab = selectedTab === 'all' || task.status === selectedTab;
      
      return matchesSearch && matchesTab;
    });
  }, [tasks, searchTerm, selectedTab]);

  // Group tasks by status
  const groupedTasks = useMemo(() => ({
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
    on_hold: filteredTasks.filter(t => t.status === 'on_hold'),
  }), [filteredTasks]);

  // Calculate task statistics
  const taskStats = useMemo(() => {
    const getDueDateStatus = (dueDate?: string) => {
      if (!dueDate) return null;
      
      const now = new Date();
      const due = new Date(dueDate);
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) return { status: 'overdue' };
      return null;
    };

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => {
        const status = getDueDateStatus(t.due_date);
        return status?.status === 'overdue';
      }).length,
    };
  }, [tasks]);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    selectedTab,
    setSelectedTab,
    filteredTasks,
    groupedTasks,
    taskStats,
  };
};