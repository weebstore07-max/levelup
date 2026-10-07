import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { targetsService, notificationsService } from '../services';
import { TargetItem } from '../types';
import { getLocalMinDateString } from '../utils/dateUtils';

export const Targets: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sorting State (Default: High Priority)
  const [sortBy, setSortBy] = useState<string>('High Priority');

  // Add Target Form States
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [newDate, setNewDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Target Modal States
  const [editingTarget, setEditingTarget] = useState<TargetItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [editDate, setEditDate] = useState('');
  const [editProgress, setEditProgress] = useState(0);

  const activeUserId = currentUser?.uid;
  const todayStr = new Date().toISOString().split('T')[0];
  const minDateStr = getLocalMinDateString(userProfile?.created_at);

  useEffect(() => {
    if (activeUserId) {
      fetchTargetsData();
    } else {
      setTargets([]);
      setLoading(false);
    }
  }, [currentUser]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastInfo({ message, type });
    setTimeout(() => {
      setToastInfo(null);
    }, 4000);
  };

  const fetchTargetsData = async () => {
    if (!activeUserId) return;
    try {
      setLoading(true);
      const data = await targetsService.getByUserId(activeUserId);
      setTargets(data || []);
    } catch (err) {
      console.warn('Targets fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for automatic status calculation
  const getAutoStatus = (progress: number, targetDate?: string): 'completed' | 'behind' | 'in_progress' => {
    if (progress >= 100) return 'completed';
    if (targetDate && targetDate < todayStr) return 'behind';
    return 'in_progress';
  };

  // Remaining days calculation
  const getRemainingDaysText = (targetDate?: string, progress?: number): string => {
    if (progress !== undefined && progress >= 100) return 'Completed';
    if (!targetDate) return 'No deadline';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDate.split('-').map(Number);
    const deadline = new Date(y, m - 1, d);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) return `${diffDays} days left`;
    if (diffDays === 1) return '1 day left';
    if (diffDays === 0) return 'Due today';
    return `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`;
  };

  // Priority Badge Helper
  const getPriorityBadgeDetails = (priority?: string) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high') {
      return { label: 'High', dot: '🔴', bg: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (p === 'low') {
      return { label: 'Low', dot: '🟢', bg: 'bg-green-100 text-green-800 border-green-200' };
    }
    return { label: 'Medium', dot: '🟡', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
  };

  // Create Target Handler
  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate required fields: Title, Priority, Deadline
    if (!newTitle || !newTitle.trim()) {
      showToast('Target Title is required.', 'error');
      return;
    }
    if (!newPriority) {
      showToast('Priority is required.', 'error');
      return;
    }
    if (!newDate) {
      showToast('Deadline is required.', 'error');
      return;
    }
    if (minDateStr && newDate < minDateStr) {
      showToast(`Target deadline cannot be before your account creation date (${minDateStr}).`, 'error');
      return;
    }

    try {
      if (!activeUserId) return;
      setIsCreating(true);

      const created = await targetsService.create({
        user_id: activeUserId,
        title: newTitle.trim(),
        priority: newPriority,
        category: newPriority,
        target_date: newDate,
        progress_percentage: 0,
        status: 'in_progress'
      });

      if (created) {
        // 2. Clear all form inputs on success
        setNewTitle('');
        setNewPriority('high');
        setNewDate('');

        // 3. Refresh target list & top stats immediately from Supabase
        await fetchTargetsData();

        // 4. Show green success toast
        showToast('Target created successfully.', 'success');

        // 5. Send automatic notification
        notificationsService.create({
          user_id: activeUserId,
          title: `Target Created: ${created.title}`,
          message: `New target "${created.title}" set with deadline ${created.target_date || 'flexible'}.`,
          type: 'target',
          is_read: false
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to create target:', err);
      // Display Supabase error in toast and do NOT clear form
      const errorMessage = err?.message || 'Failed to insert target into Supabase.';
      showToast(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (target: TargetItem) => {
    setEditingTarget(target);
    setEditTitle(target.title);
    setEditPriority((target.priority as any) || 'medium');
    setEditDate(target.target_date || '');
    setEditProgress(target.progress_percentage || 0);
  };

  // Live Slider Change Handler (Saves immediately to Supabase)
  const handleSliderChange = async (newProgress: number) => {
    if (!editingTarget) return;

    const autoStatus = getAutoStatus(newProgress, editDate || undefined);
    setEditProgress(newProgress);

    // Update locally in state
    setTargets(prev => prev.map(t => t.id === editingTarget.id ? {
      ...t,
      title: editTitle,
      priority: editPriority,
      category: editPriority,
      target_date: editDate || undefined,
      progress_percentage: newProgress,
      status: autoStatus
    } : t));

    // Save immediately to Supabase
    try {
      await targetsService.update(editingTarget.id, {
        title: editTitle.trim(),
        priority: editPriority,
        category: editPriority,
        target_date: editDate || undefined,
        progress_percentage: newProgress,
        status: autoStatus
      });

      if (autoStatus === 'completed' && editingTarget.status !== 'completed' && activeUserId) {
        notificationsService.create({
          user_id: activeUserId,
          title: `Target Completed: ${editTitle.trim()}`,
          message: `Congratulations! You accomplished target "${editTitle.trim()}".`,
          type: 'target',
          is_read: false
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error saving progress slider:', err.message);
    }
  };

  // Handle Edit Field Changes
  const handleEditDateChange = async (newDateValue: string) => {
    if (minDateStr && newDateValue && newDateValue < minDateStr) {
      showToast(`Target deadline cannot be before your account creation date (${minDateStr}).`, 'error');
      setEditDate(editingTarget?.target_date || '');
      return;
    }
    setEditDate(newDateValue);
    if (!editingTarget) return;

    const autoStatus = getAutoStatus(editProgress, newDateValue || undefined);
    setTargets(prev => prev.map(t => t.id === editingTarget.id ? {
      ...t,
      target_date: newDateValue || undefined,
      status: autoStatus
    } : t));

    try {
      await targetsService.update(editingTarget.id, {
        target_date: newDateValue || undefined,
        status: autoStatus
      });
    } catch (err: any) {
      console.error('Error updating target date:', err.message);
    }
  };

  const handleEditPriorityChange = async (newPriorityValue: 'high' | 'medium' | 'low') => {
    setEditPriority(newPriorityValue);
    if (!editingTarget) return;

    setTargets(prev => prev.map(t => t.id === editingTarget.id ? {
      ...t,
      priority: newPriorityValue,
      category: newPriorityValue
    } : t));

    try {
      await targetsService.update(editingTarget.id, {
        priority: newPriorityValue,
        category: newPriorityValue
      });
    } catch (err: any) {
      console.error('Error updating target priority:', err.message);
    }
  };

  // Close Edit Modal
  const handleSaveEditModal = async () => {
    if (editingTarget) {
      const autoStatus = getAutoStatus(editProgress, editDate || undefined);
      try {
        await targetsService.update(editingTarget.id, {
          title: editTitle.trim(),
          priority: editPriority,
          category: editPriority,
          target_date: editDate || undefined,
          progress_percentage: editProgress,
          status: autoStatus
        });
        showToast('Target updated!');
      } catch (err: any) {
        console.error('Error saving edit modal:', err.message);
      }
    }
    setEditingTarget(null);
  };

  // Delete Target Handler
  const handleDeleteTarget = async (id: string) => {
    try {
      await targetsService.delete(id);
      setTargets(prev => prev.filter(t => t.id !== id));
      if (editingTarget?.id === id) setEditingTarget(null);
      showToast('Target deleted!');
    } catch (err: any) {
      console.error('Failed to delete target:', err.message);
    }
  };

  // Sorting Logic
  const priorityRankMap: Record<string, number> = {
    high: 1,
    medium: 2,
    low: 3
  };

  const sortedTargets = [...targets].sort((a, b) => {
    const pA = (a.priority || 'medium').toLowerCase();
    const pB = (b.priority || 'medium').toLowerCase();

    if (sortBy === 'High Priority') {
      const rA = priorityRankMap[pA] || 2;
      const rB = priorityRankMap[pB] || 2;
      return rA - rB;
    }
    if (sortBy === 'Medium Priority') {
      const medRank = (p: string) => (p === 'medium' ? 1 : p === 'high' ? 2 : 3);
      return medRank(pA) - medRank(pB);
    }
    if (sortBy === 'Low Priority') {
      const lowRank = (p: string) => (p === 'low' ? 1 : p === 'medium' ? 2 : 3);
      return lowRank(pA) - lowRank(pB);
    }
    if (sortBy === 'Deadline (Nearest)') {
      if (!a.target_date && !b.target_date) return 0;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return a.target_date.localeCompare(b.target_date);
    }
    if (sortBy === 'Recently Added') {
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return b.created_at.localeCompare(a.created_at);
    }
    return 0;
  });

  // Top Statistics Calculations (Real Supabase Data)
  const totalTargetsCount = targets.length;
  const activeTargetsCount = targets.filter(t => (t.progress_percentage || 0) < 100).length;
  const completedTargetsCount = targets.filter(t => (t.progress_percentage || 0) >= 100).length;
  const upcomingDeadlinesCount = targets.filter(t => (t.progress_percentage || 0) < 100 && !!t.target_date).length;
  const averageProgressPct = totalTargetsCount > 0
    ? Math.round(targets.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) / totalTargetsCount)
    : 0;

  return (
    <PageLayout>
      <main className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col pb-12">
        {/* Toast Banner */}
        {toastInfo && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 transition-all animate-bounce ${
            toastInfo.type === 'error' ? 'bg-red-800 text-white border border-red-700' : 'bg-primary text-on-primary'
          }`}>
            <span className={`material-symbols-outlined ${toastInfo.type === 'error' ? 'text-red-300' : 'text-green-400'}`}>
              {toastInfo.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="font-label-md text-label-md font-bold">{toastInfo.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 px-container-padding">
          <h2 className="font-display-lg text-display-lg mb-2 text-primary">Targets</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Set milestones, track your learning goals, and monitor your progress.
          </p>
        </div>

        <div className="px-container-padding space-y-8">
          {/* Top Statistics Cards (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-gutter">
            {/* Card 1: Active Targets */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Active Targets</p>
                <p className="font-display-md text-display-md text-primary font-bold">{activeTargetsCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                <span className="material-symbols-outlined text-2xl">track_changes</span>
              </div>
            </div>

            {/* Card 2: Completed */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Completed</p>
                <p className="font-display-md text-display-md text-green-700 font-bold">{completedTargetsCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-700">
                <span className="material-symbols-outlined text-2xl">task_alt</span>
              </div>
            </div>

            {/* Card 3: Upcoming Deadlines */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Upcoming Deadlines</p>
                <p className="font-display-md text-display-md text-amber-700 font-bold">{upcomingDeadlinesCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
              </div>
            </div>

            {/* Card 4: Average Progress */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Average Progress</p>
                <p className="font-display-md text-display-md text-primary font-bold">{averageProgressPct}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                <span className="material-symbols-outlined text-2xl">trending_up</span>
              </div>
            </div>
          </div>

          {/* Add New Target Card (UI Redesign) */}
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[22px] p-6 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                </div>
                <div>
                  <h3 className="font-title-lg text-title-lg text-[#111111] font-bold leading-tight">Add New Target</h3>
                  <p className="font-body-md text-sm text-[#6F6B63]">Set a new goal and start making progress.</p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-[#F6F2E8] border border-[#DDD4C6] text-[#6F6B63] text-xs font-semibold">
                Quick Add
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTarget} className="space-y-4">
              {/* Row 1: Full-width Target Title input with left icon */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-[#6F6B63] text-[20px] absolute left-4 pointer-events-none">
                  edit_note
                </span>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="Target title (e.g. Complete Advanced React Module)"
                  className="w-full py-3.5 pl-12 pr-4 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-[#111111] placeholder:text-[#6F6B63] font-body-md focus:outline-none focus:border-[#D4AF37] transition-colors"
                  required
                />
              </div>

              {/* Row 2: Left Deadline input with calendar icon, Right Priority dropdown with tag icon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Deadline input with calendar icon */}
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#6F6B63] text-[20px] absolute left-4 pointer-events-none">
                    calendar_today
                  </span>
                  <input 
                    type="date" 
                    min={minDateStr}
                    value={newDate} 
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full py-3.5 pl-12 pr-4 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-[#111111] font-body-md cursor-pointer focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                </div>

                {/* Right: Priority dropdown with tag icon */}
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#6F6B63] text-[20px] absolute left-4 pointer-events-none z-10">
                    label
                  </span>
                  <select 
                    value={newPriority} 
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full py-3.5 pl-12 pr-10 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-[#111111] font-body-md cursor-pointer focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                    required
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <span className="material-symbols-outlined text-[#6F6B63] text-[18px] absolute right-4 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Row 3: Full-width black rounded button */}
              <button 
                type="submit"
                disabled={isCreating}
                className="w-full h-[56px] rounded-[16px] bg-[#111111] text-[#FBFAF7] font-label-md font-bold text-base hover:bg-[#222222] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Target
              </button>
            </form>
          </div>

          {/* Current Targets List & Sorting Header */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-title-lg text-title-lg text-primary font-bold">Current Targets</h3>
              
              {/* Sorting Dropdown (Top-Right) */}
              <div className="flex items-center gap-2">
                <label className="font-label-md text-label-md text-on-surface-variant font-medium">Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-primary font-label-md font-bold cursor-pointer focus:outline-none focus:border-primary shadow-sm"
                >
                  <option value="High Priority">High Priority</option>
                  <option value="Medium Priority">Medium Priority</option>
                  <option value="Low Priority">Low Priority</option>
                  <option value="Deadline (Nearest)">Deadline (Nearest)</option>
                  <option value="Recently Added">Recently Added</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant font-body-md">
                Loading targets from Supabase...
              </div>
            ) : sortedTargets.length === 0 ? (
              /* Clean Empty State */
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-[#D4AF37] flex items-center justify-center border border-amber-200 mb-1">
                  <span className="material-symbols-outlined text-3xl">track_changes</span>
                </div>
                <h4 className="font-display-md text-display-md text-primary font-bold">Set your first target</h4>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-2">
                  Create a learning target and start building momentum.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const titleInput = document.querySelector('input[placeholder*="Target title"]') as HTMLInputElement;
                    if (titleInput) {
                      titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      titleInput.focus();
                    }
                  }}
                  className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Create Target</span>
                </button>
              </div>
            ) : (
              /* Targets Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-grid-gutter">
                {sortedTargets.map((target) => {
                  const priorityInfo = getPriorityBadgeDetails(target.priority);
                  const autoStatus = getAutoStatus(target.progress_percentage || 0, target.target_date);
                  const remainingDays = getRemainingDaysText(target.target_date, target.progress_percentage);

                  return (
                    <div 
                      key={target.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between gap-5 card-hover"
                    >
                      {/* Top Row: Title + Priority Badge & Status Badge */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-title-lg text-title-lg text-primary font-bold leading-snug">{target.title}</h4>
                          </div>

                          {/* Subtext: Priority + Deadline */}
                          <div className="flex items-center gap-2 pt-1">
                            {/* Priority Badge */}
                            <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 border ${priorityInfo.bg}`}>
                              <span>{priorityInfo.dot}</span>
                              {priorityInfo.label} Priority
                            </span>
                            <span className="text-on-surface-variant text-sm">•</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {target.target_date ? `Deadline: ${target.target_date}` : 'No deadline'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge (Automatic) */}
                        <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 border flex-shrink-0 ${
                          (target.progress_percentage || 0) >= 100
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : (target.progress_percentage || 0) >= 75
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : (target.progress_percentage || 0) >= 50
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (target.progress_percentage || 0) >= 100
                              ? 'bg-emerald-600'
                              : (target.progress_percentage || 0) >= 75
                              ? 'bg-amber-600'
                              : (target.progress_percentage || 0) >= 50
                              ? 'bg-blue-600'
                              : 'bg-red-600'
                          }`}></span>
                          {(target.progress_percentage || 0) >= 100
                            ? 'Completed'
                            : (target.progress_percentage || 0) >= 75
                            ? 'Almost Done'
                            : (target.progress_percentage || 0) >= 50
                            ? 'Half-way'
                            : autoStatus === 'behind'
                            ? 'Behind'
                            : 'On Track'}
                        </span>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center font-label-md text-label-md">
                          <span className="text-on-surface-variant font-medium">{remainingDays}</span>
                          <span className="font-bold text-primary font-mono">{target.progress_percentage || 0}%</span>
                        </div>
                        {/* Gold Progress Bar */}
                        <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                            style={{ width: `${target.progress_percentage || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="pt-3 border-t border-outline-variant/30 flex justify-end items-center gap-2">
                        <button 
                          onClick={() => openEditModal(target)}
                          className="px-3 py-1.5 border border-outline-variant rounded-lg font-label-md text-label-md text-primary hover:bg-surface-container-high transition-colors flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTarget(target.id)}
                          className="px-3 py-1.5 border border-outline-variant rounded-lg font-label-md text-label-md text-error hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Edit Target Modal */}
        {editingTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[24px] p-6 w-full max-w-lg shadow-xl space-y-5">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </div>
                  <h3 className="font-title-lg text-xl font-bold text-[#111111]">
                    Edit Target
                  </h3>
                </div>
                <button 
                  onClick={() => setEditingTarget(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#6F6B63] hover:text-[#111111] hover:bg-[#F6F2E8] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-4">
                {/* Full-width Title Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1.5">Title</label>
                  <input 
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full py-3 px-4 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-[#111111] font-body-md focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                </div>

                {/* Second Row: Priority Dropdown (Left) & Deadline Picker (Right) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1.5">Priority</label>
                    <select 
                      value={editPriority}
                      onChange={(e) => handleEditPriorityChange(e.target.value as any)}
                      className="w-full py-3 px-4 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-[#111111] font-body-md cursor-pointer focus:outline-none focus:border-[#D4AF37] transition-colors"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1.5">Deadline</label>
                    <input 
                      type="date"
                      min={minDateStr}
                      value={editDate}
                      onChange={(e) => handleEditDateChange(e.target.value)}
                      className="w-full py-3 px-4 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-[#111111] font-body-md cursor-pointer focus:outline-none focus:border-[#D4AF37] transition-colors"
                    />
                  </div>
                </div>

                {/* Progress Section inside soft beige container (#F7F3EA) */}
                <div className="bg-[#F7F3EA] border border-[#DDD4C6] p-4 rounded-[16px] space-y-4">
                  {/* Header Row */}
                  <div className="flex justify-between items-center">
                    <label className="font-body-md font-bold text-[#111111]">Update Progress</label>
                    <span className="font-mono text-xl font-bold text-[#D4AF37]">{editProgress}%</span>
                  </div>

                  {/* 6px Gold Progress Bar with 14px Milestone Snap Points */}
                  <div className="pt-2 pb-5 px-3">
                    <div className="relative w-full h-[6px] bg-[#DDD4C6]/60 rounded-full">
                      {/* Gold Progress Fill */}
                      <div 
                        className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                        style={{ width: `${editProgress}%` }}
                      ></div>

                      {/* Milestone Snap Points */}
                      {[25, 50, 75, 100].map((val) => {
                        const isSelected = editProgress === val;
                        const isPassed = val < editProgress;
                        return (
                          <div
                            key={val}
                            onClick={() => handleSliderChange(val)}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
                            style={{ left: `${val}%` }}
                          >
                            {/* 14px Milestone Circle */}
                            <div
                              className={`w-[14px] h-[14px] rounded-full transition-all duration-200 cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#D4AF37] border-white ring-2 ring-[#D4AF37]/40 scale-110 shadow-xs'
                                  : isPassed
                                  ? 'bg-[#D4AF37] border-[#D4AF37]'
                                  : 'bg-[#FBFAF7] border-[#DDD4C6] group-hover:border-[#D4AF37]'
                              }`}
                              title={`Set progress to ${val}%`}
                            />

                            {/* 12px Muted Label */}
                            <span 
                              className={`text-[12px] font-mono absolute top-4 -translate-x-1/2 left-1/2 transition-colors cursor-pointer ${
                                isSelected 
                                  ? 'font-bold text-[#111111]' 
                                  : isPassed
                                  ? 'font-semibold text-[#111111]'
                                  : 'font-medium text-[#6F6B63] group-hover:text-[#111111]'
                              }`}
                            >
                              {val}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clean Status Row */}
                  <div className="flex justify-between items-center pt-3 border-t border-[#DDD4C6]/50">
                    <span className="text-xs font-semibold text-[#6F6B63]">Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      editProgress >= 100
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : editProgress >= 75
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : editProgress >= 50
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {editProgress >= 100
                        ? 'Completed'
                        : editProgress >= 75
                        ? 'Almost Done'
                        : editProgress >= 50
                        ? 'Half-way'
                        : (editDate && editDate < todayStr)
                        ? 'Behind'
                        : 'On Track'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-5 py-2.5 rounded-[12px] border border-[#DDD4C6] text-[#111111] font-body-md font-semibold hover:bg-[#F6F2E8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  className="px-6 py-2.5 rounded-[12px] bg-[#111111] text-[#FBFAF7] font-body-md font-bold hover:bg-[#222222] transition-colors cursor-pointer shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageLayout>
  );
};
