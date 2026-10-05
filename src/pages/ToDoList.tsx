import React, { useEffect, useState, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { todosService, usersService, notificationsService, checkAchievements } from '../services';
import { TodoItem } from '../types';
import { supabase } from '../lib/supabase';
import { getLocalMinDateString } from '../utils/dateUtils';

const XP_REWARDS: Record<'high' | 'medium' | 'low', number> = {
  high: 30,
  medium: 20,
  low: 10
};

export const ToDoList: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Modal & Menu States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

  // Toast Notification
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const minDateStr = getLocalMinDateString(userProfile?.created_at);

  useEffect(() => {
    fetchTodos();
  }, [currentUser]);

  useEffect(() => {
    if (!taskDueDate) {
      setTaskDueDate(todayStr);
    }
  }, [todayStr]);

  // Click outside to close 3-dot dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastInfo({ message, type });
    setTimeout(() => {
      setToastInfo(null);
    }, 4000);
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      if (currentUser?.uid) {
        const data = await todosService.getByUserId(currentUser.uid);
        setTodos(data || []);
      }
    } catch (err) {
      console.warn('Todos fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Add Task Handler
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    if (minDateStr && taskDueDate && taskDueDate < minDateStr) {
      showToast(`Task due date cannot be before your account creation date (${minDateStr}).`, 'error');
      return;
    }

    if (!currentUser?.uid) {
      showToast('User not authenticated.', 'error');
      return;
    }

    try {
      const newTodo = {
        user_id: currentUser.uid,
        title: taskInput.trim(),
        category: 'General',
        priority: taskPriority,
        due_date: taskDueDate || todayStr,
        completed: false,
        created_at: new Date().toISOString()
      };

      const created = await todosService.create(newTodo);
      if (created) {
        setTaskInput('');
        setTaskDueDate(todayStr);
        setTaskPriority('medium');
        await fetchTodos();
        showToast('Task added successfully', 'success');

        const notifMsg = `You added a new task: ${created.title}`;
        await notificationsService.create({
          user_id: currentUser.uid,
          title: 'To-Do Added',
          message: notifMsg,
          type: 'todo',
          is_read: false
        }).catch((err) => console.error('Failed to create task notification:', err));
      }
    } catch (err: any) {
      console.error('Failed to create task:', err);
      showToast(err?.message || err?.error_description || String(err) || 'Failed to create task.', 'error');
    }
  };

  // 2. Toggle Complete + XP Award Integration
  const toggleTodo = async (todo: TodoItem) => {
    if (!currentUser?.uid) return;

    const nextCompleted = !todo.completed;
    const xpAmount = XP_REWARDS[todo.priority] || 10;

    // Optimistic UI update
    setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: nextCompleted } : t));

    try {
      await todosService.update(todo.id, { completed: nextCompleted });

      // Recalculate authoritative total XP in Supabase
      await usersService.recalculateUserTotalXp(currentUser.uid);
      await refreshProfile();
      await checkAchievements(currentUser.uid);

      if (!todo.completed && nextCompleted) {
        showToast(`Task completed! +${xpAmount} XP earned.`, 'success');

        const notifMsg = `You completed: ${todo.title}`;
        const existingNotifs = await notificationsService.getByUserId(currentUser.uid);
        const alreadyNotified = existingNotifs.some(
          n => (n.title === 'To-Do Completed' || n.title === 'Task Completed') && n.message === notifMsg
        );

        if (!alreadyNotified) {
          await notificationsService.create({
            user_id: currentUser.uid,
            title: 'To-Do Completed',
            message: notifMsg,
            type: 'todo',
            is_read: false
          }).catch((err) => console.error('Failed to create completed task notification:', err));
        }
      }
    } catch (err) {
      console.error('Error toggling todo status:', err);
      fetchTodos();
    }
  };

  // 3. Delete Task Handler
  const handleDeleteTask = async (id: string) => {
    try {
      await todosService.delete(id);
      setTodos(todos.filter(t => t.id !== id));
      setActiveMenuId(null);
      showToast('Task deleted.', 'success');
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      showToast('Failed to delete task.', 'error');
    }
  };

  // 4. Edit Modal Handlers
  const openEditModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDueDate(todo.due_date || todayStr);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !editTitle.trim()) {
      showToast('Task title cannot be empty.', 'error');
      return;
    }

    if (minDateStr && editDueDate && editDueDate < minDateStr) {
      showToast(`Task due date cannot be before your account creation date (${minDateStr}).`, 'error');
      return;
    }

    try {
      const updated = await todosService.update(editingTodo.id, {
        title: editTitle.trim(),
        priority: editPriority,
        due_date: editDueDate || todayStr
      });

      if (updated) {
        setTodos(todos.map(t => t.id === editingTodo.id ? updated : t));
        setEditingTodo(null);
        showToast('Task updated successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Failed to update task:', err);
      showToast('Failed to update task.', 'error');
    }
  };

  // --- Dynamic Statistics ---
  const todaysTasks = todos
    .filter(t => !t.completed && t.due_date === todayStr)
    .sort((a, b) => {
      const pScore = { high: 3, medium: 2, low: 1 };
      return pScore[b.priority] - pScore[a.priority];
    });

  const upcomingTasks = todos
    .filter(t => !t.completed && t.due_date !== todayStr)
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));

  const completedTasks = todos
    .filter(t => t.completed)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  const highPriorityCount = todos.filter(t => !t.completed && t.priority === 'high').length;

  const totalTasksCount = todos.length;
  const totalCompletedCount = completedTasks.length;
  const productivityPercentage = totalTasksCount > 0 
    ? Math.round((totalCompletedCount / totalTasksCount) * 100) 
    : 0;

  const completedThisWeekCount = completedTasks.length;

  // Priority Badge Details Helper
  const getPriorityBadgeDetails = (priority: 'high' | 'medium' | 'low') => {
    if (priority === 'high') {
      return { label: 'High', bg: 'bg-[#FCE8E6] text-[#D93025] border-[#F5C2C0]' };
    }
    if (priority === 'low') {
      return { label: 'Low', bg: 'bg-[#E6F4EA] text-[#1E8E3E] border-[#C2E7C9]' };
    }
    return { label: 'Medium', bg: 'bg-[#FEF3D6] text-[#B07200] border-[#F5E2B3]' };
  };

  // Due Date Text Helper
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    if (dateStr === todayStr) return 'Due Today';
    if (dateStr < todayStr) return `Overdue (${dateStr})`;
    return `Due ${dateStr}`;
  };

  return (
    <PageLayout>
      <div className="px-container-padding py-8 flex-1 flex flex-col gap-8 max-w-7xl mx-auto w-full">
        {/* Toast Notification */}
        {toastInfo && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
            toastInfo.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {toastInfo.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="font-label-md font-semibold text-sm">{toastInfo.message}</span>
          </div>
        )}

        {/* 1. Header */}
        <div>
          <h2 className="font-display-lg text-display-lg text-primary mb-2 font-bold">To-Do List</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Organize your learning, one task at a time.
          </p>
        </div>

        {/* 2. Statistics Cards (4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-gutter">
          <div className="bg-white border border-[#E7E1D6] rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Today's Tasks</p>
              <p className="font-headline-sm text-headline-sm font-bold text-primary">{todaysTasks.length}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Due today</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#f0e7d8] flex items-center justify-center border border-outline-variant/30 text-[#8C7A5B]">
              <span className="material-symbols-outlined">today</span>
            </div>
          </div>

          <div className="bg-white border border-[#E7E1D6] rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Completed This Week</p>
              <p className="font-headline-sm text-headline-sm font-bold text-primary">{completedThisWeekCount}</p>
              <p className="font-label-sm text-label-sm text-[#1e8e3e] mt-1">Great momentum</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#e6f4ea] flex items-center justify-center border border-outline-variant/30 text-[#1e8e3e]">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
          </div>

          <div className="bg-white border border-[#E7E1D6] rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">High Priority Tasks</p>
              <p className="font-headline-sm text-headline-sm font-bold text-primary">{highPriorityCount}</p>
              <p className="font-label-sm text-label-sm text-[#d93025] mt-1">Needs attention</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#fce8e6] flex items-center justify-center border border-outline-variant/30 text-[#d93025]">
              <span className="material-symbols-outlined">priority_high</span>
            </div>
          </div>

          <div className="bg-white border border-[#E7E1D6] rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Productivity</p>
              <p className="font-headline-sm text-headline-sm font-bold text-primary">{productivityPercentage}%</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Tasks completed</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#f3e8fd] flex items-center justify-center border border-outline-variant/30 text-[#9333ea]">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
          </div>
        </div>

        {/* 3. Quick Add Task */}
        <div className="bg-white border border-[#E7E1D6] rounded-[24px] p-6 shadow-sm">
          <h3 className="font-title-lg text-title-lg font-bold text-primary mb-4">Quick Add Task</h3>
          <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4 items-center">
            {/* Task Title Input */}
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="What do you need to study or accomplish?"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-white text-body-md text-primary placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            {/* Due Date Picker */}
            <div className="w-full md:w-48">
              <input
                type="date"
                min={minDateStr}
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-white text-body-md text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              />
            </div>

            {/* Priority Dropdown (No colored circles) */}
            <div className="w-full md:w-48">
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-white text-body-md text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Black Add Task Button */}
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Task
            </button>
          </form>
        </div>

        {/* 4. Task Sections */}
        <div className="flex flex-col gap-8">
          {/* Section A: Today's Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#8C7A5B]">today</span>
                Today's Tasks ({todaysTasks.length})
              </h3>
              <span className="font-label-sm text-xs text-on-surface-variant">Sorted by Priority</span>
            </div>

            {todaysTasks.length === 0 ? (
              <div className="bg-white border border-[#E7E1D6] rounded-[18px] p-8 text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">done_all</span>
                <p className="font-body-md text-on-surface-variant text-sm font-medium">
                  No tasks due today. You're all caught up!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {todaysTasks.map((todo) => renderTaskCard(todo))}
              </div>
            )}
          </div>

          {/* Section B: Upcoming */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">event_upcoming</span>
                Upcoming ({upcomingTasks.length})
              </h3>
              <span className="font-label-sm text-xs text-on-surface-variant">Ordered by Due Date</span>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="bg-white border border-[#E7E1D6] rounded-[18px] p-8 text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">event_available</span>
                <p className="font-body-md text-on-surface-variant text-sm font-medium">
                  No upcoming tasks scheduled.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingTasks.map((todo) => renderTaskCard(todo))}
              </div>
            )}
          </div>

          {/* Section C: Completed */}
          <div>
            <div 
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="flex items-center justify-between mb-4 cursor-pointer select-none group"
            >
              <h3 className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#1e8e3e]">task_alt</span>
                Completed ({completedTasks.length})
              </h3>
              <button className="text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-xs font-semibold cursor-pointer">
                <span>{isCompletedExpanded ? 'Hide' : 'Show'}</span>
                <span className="material-symbols-outlined text-lg">
                  {isCompletedExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {isCompletedExpanded && (
              completedTasks.length === 0 ? (
                <div className="bg-white border border-[#E7E1D6] rounded-[18px] p-8 text-center flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">check_circle_outline</span>
                  <p className="font-body-md text-on-surface-variant text-sm font-medium">
                    No completed tasks yet. Check off a task to earn XP!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {completedTasks.map((todo) => renderTaskCard(todo))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Edit Task Modal */}
        {editingTodo && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E7E1D6] rounded-[24px] p-6 w-full max-w-lg shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#E7E1D6] pb-3">
                <h3 className="font-title-lg text-title-lg font-bold text-primary">Edit Task</h3>
                <button 
                  onClick={() => setEditingTodo(null)}
                  className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                <div>
                  <label className="block font-label-sm text-xs text-on-surface-variant font-bold uppercase mb-1">Task Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-white text-body-md text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-xs text-on-surface-variant font-bold uppercase mb-1">Due Date</label>
                    <input
                      type="date"
                      min={minDateStr}
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-white text-body-md text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-xs text-on-surface-variant font-bold uppercase mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as 'high' | 'medium' | 'low')}
                      className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-white text-body-md text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#E7E1D6]">
                  <button
                    type="button"
                    onClick={() => setEditingTodo(null)}
                    className="px-5 py-2.5 rounded-xl border border-outline-variant font-bold text-sm text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );

  // Task Card Render Helper
  function renderTaskCard(todo: TodoItem) {
    const badge = getPriorityBadgeDetails(todo.priority);
    const isMenuOpen = activeMenuId === todo.id;

    return (
      <div 
        key={todo.id} 
        className={`p-[18px] min-h-[76px] rounded-[18px] bg-white border border-[#D8CFBF] flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-sm hover:border-[#C5A880]/60 relative overflow-visible ${
          isMenuOpen ? 'z-30' : 'z-0'
        } ${
          todo.completed ? 'opacity-85' : ''
        }`}
      >
        {/* Left: 20px Circular Checkbox + Title + Due Date */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <button
            onClick={() => toggleTodo(todo)}
            className={`w-[20px] h-[20px] min-w-[20px] min-h-[20px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
              todo.completed 
                ? 'bg-[#C5A880] border-2 border-[#C5A880] text-white shadow-sm' 
                : 'bg-white border-2 border-[#C5A880] hover:border-[#A88B60]'
            }`}
          >
            {todo.completed && (
              <span className="material-symbols-outlined text-[13px] font-bold leading-none">
                check
              </span>
            )}
          </button>

          {/* Title & Due Date */}
          <div className="min-w-0 flex-1">
            <h4 className={`text-[16px] leading-tight truncate ${
              todo.completed ? 'line-through text-[#8C8275] font-normal' : 'text-[#2C2825] font-semibold'
            }`}>
              {todo.title}
            </h4>
            <div className={`flex items-center gap-1 text-xs mt-1 ${
              todo.completed ? 'text-[#A09587]' : 'text-[#8C8275]'
            }`}>
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              <span>{formatDueDate(todo.due_date)}</span>
            </div>
          </div>
        </div>

        {/* Right: Priority Badge & 3-Dot Menu */}
        <div className="flex items-center gap-3 flex-shrink-0 relative">
          {/* Priority Badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
            {badge.label}
          </span>

          {/* Three-Dot Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenuId(isMenuOpen ? null : todo.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8C8275] hover:bg-[#EFE9DD] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">more_vert</span>
            </button>

            {isMenuOpen && (
              <div 
                ref={menuRef}
                className="absolute right-0 top-9 w-36 bg-white border border-[#D8CFBF] rounded-xl shadow-lg py-2 z-[100]"
              >
                <button
                  onClick={() => openEditModal(todo)}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-[#2C2825] hover:bg-[#F8F5EE] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTask(todo.id)}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};
