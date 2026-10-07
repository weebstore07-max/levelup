import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { coursesService, lessonsService, lessonProgressService, studySessionsService, notificationsService, usersService, calculateStreak, getSortedLessons, mergeLessonsWithProgress, classifyCourseCategory, freezePassService, CATEGORY_COLORS, CourseCategory } from '../services';
import { Course, Lesson, LessonProgress, MergedLesson } from '../types';

const parseISO8601Duration = (duration: string): number => {
  if (!duration) return 1;
  const match = duration.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/i);
  if (!match) return 1;
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);
  const totalSeconds = (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
  const totalMinutes = Math.round(totalSeconds / 60);
  return totalMinutes > 0 ? totalMinutes : 1;
};

const formatLessonDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
};

export const Tracks: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
  const [progressList, setProgressList] = useState<LessonProgress[]>([]);
  const [playlistInput, setPlaylistInput] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [openMenuCourseId, setOpenMenuCourseId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('Recently Added');
  const [loading, setLoading] = useState(true);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTracksData();
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('import') === 'true' || window.location.hash === '#import') {
      setTimeout(() => {
        importInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        importInputRef.current?.focus();
      }, 150);
    }
  }, []);

  const fetchTracksData = async () => {
    try {
      setLoading(true);

      if (!currentUser?.uid) {
        setCourses([]);
        setLessonsMap({});
        setProgressList([]);
        setLoading(false);
        return;
      }

      const fetchedCourses = await coursesService.getByUserId(currentUser.uid);
      setCourses(fetchedCourses);

      const allLessonsMap: Record<string, Lesson[]> = {};
      for (const course of fetchedCourses) {
        const courseLessons = await lessonsService.getByCourseId(course.id);
        allLessonsMap[course.id] = courseLessons;
      }
      setLessonsMap(allLessonsMap);

      const fetchedProgress = await lessonProgressService.getByUserId(currentUser.uid);
      setProgressList(fetchedProgress);
    } catch (err) {
      console.warn('Tracks data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

interface ParsedYouTubeContent {
  type: 'playlist' | 'video';
  id: string;
}

const parseYouTubeContentUrl = (input: string): ParsedYouTubeContent | null => {
  const urlText = input.trim();
  if (!urlText) return null;

  // 1. Check for playlist parameter 'list=' in URL
  const listMatch = urlText.match(/[?&]list=([^#&?]+)/);
  if (listMatch && listMatch[1]) {
    return { type: 'playlist', id: listMatch[1] };
  }

  // 2. Check for raw playlist ID starting with PL, RDPL, FL, UU
  if (/^(PL|RDPL|FL|UU)[a-zA-Z0-9_-]{10,}$/i.test(urlText)) {
    return { type: 'playlist', id: urlText };
  }

  // 3. Check for single video URL formats:
  // youtu.be/VIDEO_ID
  const youtuBeMatch = urlText.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return { type: 'video', id: youtuBeMatch[1] };
  }

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = urlText.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return { type: 'video', id: watchMatch[1] };
  }

  // youtube.com/embed/VIDEO_ID or youtube.com/shorts/VIDEO_ID
  const embedOrShortsMatch = urlText.match(/youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/i);
  if (embedOrShortsMatch && embedOrShortsMatch[1]) {
    return { type: 'video', id: embedOrShortsMatch[1] };
  }

  // 4. Raw 11-character Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlText)) {
    return { type: 'video', id: urlText };
  }

  return null;
};

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistInput.trim()) return;

    setImportMessage('');
    setErrorMessage('');

    try {
      const urlText = playlistInput.trim();
      const parsedContent = parseYouTubeContentUrl(urlText);

      if (!parsedContent) {
        setErrorMessage('Please enter a valid YouTube video or playlist URL.');
        return;
      }

      // Check duplicate imports
      const isDuplicate = courses.some(c => 
        c.description?.includes(parsedContent.id) || 
        c.title.toLowerCase() === urlText.toLowerCase()
      );

      if (isDuplicate) {
        setErrorMessage(`This YouTube ${parsedContent.type === 'video' ? 'video' : 'playlist'} has already been imported!`);
        return;
      }

      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

      if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY') {
        setErrorMessage('VITE_YOUTUBE_API_KEY is not set in .env file.');
        return;
      }

      if (parsedContent.type === 'video') {
        // SINGLE VIDEO IMPORT
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${parsedContent.id}&key=${apiKey}`
        );
        const videoData = await videoRes.json();

        if (videoData?.error) {
          throw new Error(videoData.error.message || 'YouTube Data API error fetching video details');
        }

        if (!videoData?.items || videoData.items.length === 0) {
          throw new Error('YouTube video not found or is private.');
        }

        const vSnippet = videoData.items[0].snippet;
        const vContentDetails = videoData.items[0].contentDetails;

        const videoTitle = vSnippet?.title || 'Imported YouTube Video';
        const videoDescription = vSnippet?.description || '';
        const channelTitle = vSnippet?.channelTitle || '';

        const thumbs = vSnippet?.thumbnails;
        const thumbnailUrl = thumbs?.maxres?.url || 
                             thumbs?.high?.url || 
                             thumbs?.medium?.url || 
                             thumbs?.default?.url || 
                             'https://images.unsplash.com/photo-1516116211223-4c71414a6743?auto=format&fit=crop&w=300&q=80';

        const durationMins = vContentDetails?.duration ? parseISO8601Duration(vContentDetails.duration) : 1;
        const estimatedHours = Number((durationMins / 60).toFixed(1)) || 0.1;

        // AI Category Detection
        const category = classifyCourseCategory({
          title: videoTitle,
          description: videoDescription,
          channelTitle: channelTitle,
          thumbnailUrl: thumbnailUrl
        });

        const courseId = crypto.randomUUID();
        const newCourseData = {
          id: courseId,
          user_id: currentUser?.uid,
          title: videoTitle,
          category: category,
          description: `YouTube Video ID: ${parsedContent.id} [user:${currentUser?.uid || ''}]`,
          thumbnail_url: thumbnailUrl,
          total_lessons: 1,
          estimated_hours: estimatedHours > 0 ? estimatedHours : 0.1,
          level: 'Intermediate'
        };

        const createdCourse = await coursesService.create(newCourseData);

        if (createdCourse) {
          const generatedLesson = {
            id: crypto.randomUUID(),
            course_id: createdCourse.id,
            title: videoTitle,
            order_index: 1,
            duration_minutes: durationMins,
            video_id: parsedContent.id,
            video_url: `https://www.youtube.com/watch?v=${parsedContent.id}`,
            youtube_video_id: parsedContent.id,
            youtube_url: `https://www.youtube.com/watch?v=${parsedContent.id}`
          };

          const createdLessons = await lessonsService.createMany([generatedLesson]);

          setCourses([createdCourse, ...courses]);
          setLessonsMap({ ...lessonsMap, [createdCourse.id]: createdLessons });
          setErrorMessage('');
          setImportMessage(`Successfully imported video "${videoTitle}"!`);
          window.dispatchEvent(new CustomEvent('courses-updated'));

          if (currentUser?.uid) {
            try {
              await notificationsService.create({
                user_id: currentUser.uid,
                title: `Video Imported: ${videoTitle}`,
                message: `Your video "${videoTitle}" (${durationMins}m) has been imported.`,
                type: 'track',
                is_read: false
              });
            } catch (notifErr) {
              console.warn('Failed to create notification:', notifErr);
            }
          }
        }
      } else {
        // PLAYLIST IMPORT
        const playlistId = parsedContent.id;

        const playlistRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
        );
        const playlistData = await playlistRes.json();

        if (playlistData?.error) {
          throw new Error(playlistData.error.message || 'YouTube Data API error fetching playlist metadata');
        }

        if (!playlistData?.items || playlistData.items.length === 0) {
          throw new Error('YouTube playlist not found or is private.');
        }

        const playlistSnippet = playlistData.items[0].snippet;
        const courseTitle = playlistSnippet.title || 'Imported YouTube Course';
        const playlistDescription = playlistSnippet.description || '';
        const channelTitle = playlistSnippet.channelTitle || '';

        const thumbs = playlistSnippet.thumbnails;
        const thumbnailUrl = thumbs?.high?.url || 
                             thumbs?.medium?.url || 
                             thumbs?.default?.url || 
                             thumbs?.maxres?.url || 
                             thumbs?.standard?.url || 
                             'https://images.unsplash.com/photo-1516116211223-4c71414a6743?auto=format&fit=crop&w=300&q=80';

        const category = classifyCourseCategory({
          title: courseTitle,
          description: playlistDescription,
          channelTitle: channelTitle,
          thumbnailUrl: thumbnailUrl
        });

        const videoItems: { title: string; videoId: string }[] = [];
        let pageToken = '';

        do {
          const pageUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
          const itemsRes = await fetch(pageUrl);
          const itemsData = await itemsRes.json();

          if (itemsData?.error) {
            throw new Error(itemsData.error.message || 'YouTube Data API error fetching playlist items');
          }

          if (itemsData?.items && Array.isArray(itemsData.items)) {
            for (const item of itemsData.items) {
              const vTitle = item.snippet?.title;
              const videoId = item.snippet?.resourceId?.videoId;
              if (vTitle && vTitle !== 'Private video' && vTitle !== 'Deleted video' && videoId) {
                videoItems.push({ title: vTitle, videoId });
              }
            }
          }
          pageToken = itemsData?.nextPageToken || '';
        } while (pageToken);

        if (videoItems.length === 0) {
          throw new Error('No public videos found in this YouTube playlist.');
        }

        const videoDurationsMap: Record<string, number> = {};

        for (let i = 0; i < videoItems.length; i += 50) {
          const chunk = videoItems.slice(i, i + 50);
          const ids = chunk.map(v => encodeURIComponent(v.videoId)).join(',');
          const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`
          );
          const videosData = await videosRes.json();

          if (videosData?.error) {
            throw new Error(videosData.error.message || 'YouTube Data API error fetching video details');
          }

          if (videosData?.items && Array.isArray(videosData.items)) {
            for (const vItem of videosData.items) {
              const isoDuration = vItem.contentDetails?.duration;
              if (isoDuration) {
                videoDurationsMap[vItem.id] = parseISO8601Duration(isoDuration);
              }
            }
          }
        }

        const totalMinutesSum = videoItems.reduce(
          (sum, item) => sum + (videoDurationsMap[item.videoId] || 1), 
          0
        );
        const estimatedHours = Number((totalMinutesSum / 60).toFixed(1));

        const courseId = crypto.randomUUID();
        const newCourseData = {
          id: courseId,
          user_id: currentUser?.uid,
          title: courseTitle,
          category: category,
          description: `YouTube Playlist ID: ${playlistId} [user:${currentUser?.uid || ''}]`,
          thumbnail_url: thumbnailUrl,
          total_lessons: videoItems.length,
          estimated_hours: estimatedHours > 0 ? estimatedHours : 1,
          level: 'Intermediate'
        };

        const createdCourse = await coursesService.create(newCourseData);

        if (createdCourse) {
          const generatedLessons = videoItems.map((vItem, i) => ({
            id: crypto.randomUUID(),
            course_id: createdCourse.id,
            title: vItem.title,
            order_index: i + 1,
            duration_minutes: videoDurationsMap[vItem.videoId] || 1,
            video_id: vItem.videoId,
            video_url: `https://www.youtube.com/watch?v=${vItem.videoId}`,
            youtube_video_id: vItem.videoId,
            youtube_url: `https://www.youtube.com/watch?v=${vItem.videoId}`
          }));

          const createdLessons = await lessonsService.createMany(generatedLessons);

          setCourses([createdCourse, ...courses]);
          setLessonsMap({ ...lessonsMap, [createdCourse.id]: createdLessons });
          setErrorMessage('');
          setImportMessage(`Successfully imported playlist "${courseTitle}" with ${createdLessons.length} lessons!`);
          window.dispatchEvent(new CustomEvent('courses-updated'));

          if (currentUser?.uid) {
            try {
              await notificationsService.create({
                user_id: currentUser.uid,
                title: `Course Imported: ${courseTitle}`,
                message: `Your new course "${courseTitle}" with ${createdLessons.length} lessons has been imported from YouTube.`,
                type: 'track',
                is_read: false
              });
            } catch (notifErr) {
              console.warn('Failed to create import notification:', notifErr);
            }
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import YouTube content.');
    } finally {
      setPlaylistInput('');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {

    try {
      await coursesService.delete(courseId);
      setCourses(courses.filter(c => c.id !== courseId));
      const updatedLessons = { ...lessonsMap };
      delete updatedLessons[courseId];
      setLessonsMap(updatedLessons);
      setOpenMenuCourseId(null);
      window.dispatchEvent(new CustomEvent('courses-updated'));
    } catch (err: any) {
      console.error('Failed to delete course:', err.message);
    }
  };

  const getMergedLessonsForCourse = (courseId: string): MergedLesson[] => {
    const courseLessons = getSortedLessons(lessonsMap[courseId]);
    return mergeLessonsWithProgress(courseLessons, progressList);
  };

  const toggleLessonComplete = async (courseId: string, targetLessonId: string) => {
    if (!targetLessonId || !currentUser?.uid) return;

    const activeUserId = currentUser.uid;
    const userEmail = currentUser.email || undefined;

    const targetLesson = (lessonsMap[courseId] || []).find(l => l.id === targetLessonId);
    const durationMins = targetLesson?.duration_minutes || 1;

    const currentProgress = progressList.find(p => p.lesson_id === targetLessonId);
    const nextCompleted = !currentProgress?.completed;

    // Optimistic UI update
    const updatedList = progressList.filter(p => p.lesson_id !== targetLessonId);
    updatedList.push({
      id: currentProgress?.id || `temp-${targetLessonId}`,
      user_id: activeUserId,
      lesson_id: targetLessonId,
      course_id: courseId,
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null
    });
    setProgressList(updatedList);

    try {
      await lessonProgressService.upsert({
        user_id: activeUserId,
        lesson_id: targetLessonId,
        course_id: courseId,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null
      }, userEmail);

      if (nextCompleted) {
        await studySessionsService.recordLessonCompletionSession(activeUserId, targetLessonId, durationMins);
      } else {
        await studySessionsService.removeLessonCompletionSession(activeUserId, targetLessonId, durationMins);
      }

      const freshProgress = await lessonProgressService.getByUserId(activeUserId);
      const freshSessions = await studySessionsService.getByUserId(activeUserId);
      setProgressList(freshProgress);

      await freezePassService.processUserStreakAndFreeze(
        activeUserId,
        freshProgress,
        freshSessions,
        userProfile
      );
    } catch (err) {
      console.error('Failed to save lesson progress:', err);
      const freshProgress = await lessonProgressService.getByUserId(activeUserId);
      setProgressList(freshProgress);
    }
  };

  // Helper to calculate course progress %
  const getCourseMetrics = (courseId: string, totalLessons: number) => {
    const merged = getMergedLessonsForCourse(courseId);
    const completedCount = merged.filter(l => l.completed).length;
    const total = merged.length || totalLessons || 1;
    const pct = Math.round((completedCount / total) * 100);
    const remainingCount = total - completedCount;
    return { completedCount, remainingCount, pct, total };
  };

  // Calculate Overall System Metrics
  let grandTotalLessons = 0;
  let grandCompletedLessons = 0;

  courses.forEach(c => {
    const { total, completedCount } = getCourseMetrics(c.id, c.total_lessons);
    grandTotalLessons += total;
    grandCompletedLessons += completedCount;
  });

  const grandRemainingLessons = Math.max(0, grandTotalLessons - grandCompletedLessons);
  const overallPct = grandTotalLessons > 0 ? Math.round((grandCompletedLessons / grandTotalLessons) * 100) : 0;

  // Active Courses = count of courses where completion is less than 100%
  const activeCoursesCount = courses.filter(c => getCourseMetrics(c.id, c.total_lessons).pct < 100).length;

  // Completed Courses = count of courses where every lesson is completed (pct === 100%)
  const completedCoursesCount = courses.filter(c => getCourseMetrics(c.id, c.total_lessons).pct === 100).length;

  // Sorting
  const sortedCourses = [...courses].sort((a, b) => {
    if (sortOption === 'Progress High-Low') {
      const pA = getCourseMetrics(a.id, a.total_lessons).pct;
      const pB = getCourseMetrics(b.id, b.total_lessons).pct;
      return pB - pA;
    }
    return 0; // Default Recently Added
  });

  return (
    <PageLayout>
      <div className="px-container-padding py-8 flex-1 flex flex-col gap-8">
        {/* Page Header */}
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">Tracks</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your learning courses and track your progress.
          </p>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter">
          <div className="card-surface rounded-xl p-card-padding flex items-start gap-4 bg-surface-container-lowest card-border">
            <div className="w-12 h-12 rounded-full bg-[#e6f4ea] flex items-center justify-center text-[#1e8e3e]">
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Active Courses</div>
              <div className="font-headline-md text-headline-md text-primary">{activeCoursesCount}</div>
              <div className="font-label-sm text-label-sm text-[#1e8e3e] mt-2">Keep learning!</div>
            </div>
          </div>

          <div className="card-surface rounded-xl p-card-padding flex items-start gap-4 bg-surface-container-lowest card-border">
            <div className="w-12 h-12 rounded-full bg-[#f3e8fd] flex items-center justify-center text-[#9333ea]">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Completed Courses</div>
              <div className="font-headline-md text-headline-md text-primary">{completedCoursesCount}</div>
              <div className="font-label-sm text-label-sm text-[#9333ea] mt-2">Great job!</div>
            </div>
          </div>

          <div className="card-surface rounded-xl p-card-padding flex items-start gap-4 bg-surface-container-lowest card-border">
            <div className="w-12 h-12 rounded-full bg-[#fce8e6] flex items-center justify-center text-[#d93025]">
              <span className="material-symbols-outlined">bar_chart</span>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Overall Progress</div>
              <div className="font-headline-md text-headline-md text-primary">{overallPct}%</div>
              <div className="font-label-sm text-label-sm text-[#d93025] mt-2">You're doing great!</div>
            </div>
          </div>
        </div>

        {/* Import YouTube Content Section */}
        <div className="bg-white border border-[#E7E1D6] rounded-xl p-6 mb-2 flex flex-col gap-3">
          <form onSubmit={handleAddCourse} className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-title-lg text-title-lg text-primary mb-1 font-bold">Import YouTube Content</h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Paste a YouTube video or playlist link to import content and lessons.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-[500px]">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">link</span>
                </div>
                <input 
                  ref={importInputRef}
                  type="text"
                  value={playlistInput}
                  onChange={(e) => setPlaylistInput(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-outline-variant rounded-[10px] bg-white text-body-md placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="Paste YouTube video or playlist link here..." 
                />
              </div>
              <button 
                type="submit"
                className="w-[46px] h-[46px] bg-primary text-on-primary rounded-[10px] flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </form>

          {importMessage && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs font-bold text-green-800">
              {importMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-800">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Active Courses List */}
        {courses.length === 0 ? (
          <div className="bg-white border border-[#E7E1D6] rounded-xl p-12 text-center flex flex-col items-center justify-center my-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 text-primary">
              <span className="material-symbols-outlined text-3xl">menu_book</span>
            </div>
            <h3 className="font-display-md text-display-md text-primary font-bold mb-2">
              Your learning journey starts here
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
              Add a YouTube playlist to create your first learning track.
            </p>
            <button
              type="button"
              onClick={() => {
                importInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                importInputRef.current?.focus();
              }}
              className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Create Track</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center bg-white border border-[#E7E1D6] rounded-xl py-4 px-6 mb-4">
            <h3 className="font-title-lg text-title-lg text-primary font-bold">Active Courses ({courses.length})</h3>
            <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <span>Sort by:</span>
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="border border-outline-variant rounded-md py-1 px-2 bg-transparent text-primary focus:ring-0 focus:border-outline cursor-pointer"
              >
                <option>Recently Added</option>
                <option>Progress High-Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 items-start">
            <div className="bg-white border border-[#E7E1D6] rounded-xl flex flex-col px-6 pb-6">
              <div className="flex flex-col">
                {sortedCourses.map((course) => {
                  const { completedCount, remainingCount, pct, total } = getCourseMetrics(course.id, course.total_lessons);
                  const mergedLessons = getMergedLessonsForCourse(course.id);
                  const isExpanded = expandedCourseId === course.id;
                  const isMenuOpen = openMenuCourseId === course.id;

                  const catColor = CATEGORY_COLORS[course.category as CourseCategory] || CATEGORY_COLORS['Other'];
                  const badgeClass = catColor.badge;

                  return (
                    <div key={course.id} className="py-6 border-b border-[#E7E1D6] flex flex-col">
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Course Thumbnail (220x124 px 16:9, rounded-[16px]) */}
                        {course.thumbnail_url ? (
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title} 
                            className="w-full md:w-[220px] h-[124px] rounded-[16px] object-cover flex-shrink-0 border border-outline-variant"
                          />
                        ) : (
                          <div className={`w-full md:w-[220px] h-[124px] rounded-[16px] ${badgeClass} flex items-center justify-center flex-shrink-0 font-bold text-lg border border-outline-variant text-center px-2`}>
                            {course.category}
                          </div>
                        )}

                        {/* Middle Details: Title, Metadata, Progress Bar directly below metadata */}
                        <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                          <h4 className="font-title-lg text-title-lg text-primary mb-1 font-bold">{course.title}</h4>
                          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant mb-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${catColor.badge}`}>
                              {course.category}
                            </span>
                            <span>•</span>
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            <span>{total} lessons</span>
                            <span>•</span>
                            <span>{course.estimated_hours || 10}h</span>
                          </div>

                          {/* 35-40% Shorter Progress Bar directly below metadata */}
                          <div className="flex flex-col gap-1 w-full max-w-[480px] md:w-[60%]">
                            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                              <span>{completedCount} completed</span>
                              <span>{remainingCount} remaining</span>
                            </div>
                            <div className="w-full bg-[#E5E1D9] h-2 rounded-full overflow-hidden">
                              <div className="bg-[#D4B24C] h-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* Percentage */}
                        <div className="font-headline-sm text-headline-sm text-primary w-16 text-left md:text-right font-bold flex-shrink-0">
                          {pct}%
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 relative flex-shrink-0 self-start md:self-center">
                          <button 
                            onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                            className="px-4 py-2 border border-outline-variant rounded-[10px] flex items-center gap-2 font-label-md text-label-md text-primary hover:bg-surface-variant transition-colors cursor-pointer"
                          >
                            {isExpanded ? 'Hide Details' : 'Continue Learning'}
                            <span className="material-symbols-outlined text-sm">
                              {isExpanded ? 'expand_less' : 'arrow_forward'}
                            </span>
                          </button>
                          
                          {/* Three-Dot Menu Button */}
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuCourseId(isMenuOpen ? null : course.id)}
                              className="w-10 h-10 border border-outline-variant rounded-[10px] flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer"
                              title="Course Options"
                            >
                              <span className="material-symbols-outlined">more_vert</span>
                            </button>

                            {/* Dropdown Menu for Deleting Course */}
                            {isMenuOpen && (
                              <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E7E1D6] rounded-xl shadow-lg py-2 z-30">
                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-label-md text-error hover:bg-red-50 transition-colors text-left cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                  Delete Course
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Course Details & Lessons Drawer when Continue Learning is clicked */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-[#E7E1D6] flex flex-col gap-3 bg-surface-container-low/50 p-4 rounded-xl">
                          <h5 className="font-label-md text-label-md font-bold text-primary mb-2">
                            Course Lessons & Progress ({mergedLessons.length} Modules):
                          </h5>
                          {mergedLessons.length === 0 ? (
                            <p className="font-body-md text-on-surface-variant text-sm">No lessons registered for this course.</p>
                          ) : (
                            mergedLessons.map((lesson) => {
                              const done = lesson.completed;
                              const videoUrl = lesson.youtube_url || lesson.video_url || ((lesson.youtube_video_id || lesson.video_id) ? `https://www.youtube.com/watch?v=${lesson.youtube_video_id || lesson.video_id}` : null);
                              return (
                                <div 
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E7E1D6] hover:bg-surface-container-high transition-colors"
                                >
                                  <div 
                                    onClick={() => toggleLessonComplete(course.id, lesson.id)}
                                    className="flex items-center gap-3 cursor-pointer flex-1"
                                  >
                                    <span className={`material-symbols-outlined text-lg ${done ? 'text-green-600' : 'text-on-surface-variant'}`}>
                                      {done ? 'check_circle' : 'radio_button_unchecked'}
                                    </span>
                                    <span className={`font-body-md text-body-md ${done ? 'line-through text-on-surface-variant' : 'text-primary font-medium'}`}>
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    {videoUrl ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(videoUrl, "_blank", "noopener,noreferrer");
                                        }}
                                        className="transition-opacity hover:opacity-80 cursor-pointer flex items-center justify-center p-0.5"
                                        title="Watch video on YouTube"
                                      >
                                        <svg className="w-5 h-5 text-[#FF0000] fill-current" viewBox="0 0 24 24">
                                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                        </svg>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        onClick={(e) => e.stopPropagation()}
                                        className="opacity-40 cursor-not-allowed flex items-center justify-center p-0.5"
                                        title="Video unavailable"
                                      >
                                        <svg className="w-5 h-5 text-gray-400 fill-current" viewBox="0 0 24 24">
                                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                        </svg>
                                      </button>
                                    )}
                                    <span className="text-xs text-on-surface-variant font-mono">
                                      {formatLessonDuration(lesson.duration_minutes)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center pt-6 font-label-sm text-label-sm text-on-surface-variant">
                Showing {courses.length} of {courses.length} active courses
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Progress Report Section */}
        <div className="card-surface rounded-xl p-6 bg-white border border-[#E7E1D6]">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-4 font-bold">Progress Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-48 h-48 rounded-full border-8 border-[#D4B24C] relative flex items-center justify-center flex-shrink-0 bg-surface-container-low">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-headline-md text-headline-md text-primary font-bold">{overallPct}%</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Overall</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex md:flex-row gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#1e7b41]"></div>
                  <div className="font-label-md text-label-md text-primary">
                    Completed <span className="text-on-surface-variant font-normal">{grandCompletedLessons} ({overallPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#D4B24C]"></div>
                  <div className="font-label-md text-label-md text-primary">
                    Remaining <span className="text-on-surface-variant font-normal">{grandRemainingLessons}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="border border-outline-variant rounded-xl flex items-center gap-4 bg-white py-2 px-4">
                  <div className="w-10 h-10 rounded-full bg-[#e6f4ea] flex items-center justify-center text-[#1e8e3e]">
                    <span className="material-symbols-outlined text-lg">menu_book</span>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-0.5">Total Lessons</div>
                    <div className="font-title-lg text-title-lg text-primary font-bold">{grandTotalLessons}</div>
                  </div>
                </div>
                <div className="border border-outline-variant rounded-xl flex items-center gap-4 bg-white py-2 px-4">
                  <div className="w-10 h-10 rounded-full bg-[#e6f4ea] flex items-center justify-center text-[#1e8e3e]">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-0.5">Completed</div>
                    <div className="font-title-lg text-title-lg text-primary font-bold">{grandCompletedLessons}</div>
                  </div>
                </div>
                <div className="border border-outline-variant rounded-xl flex items-center gap-4 bg-white py-2 px-4">
                  <div className="w-10 h-10 rounded-full bg-[#fdf2d1] flex items-center justify-center text-[#d97706]">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-0.5">Remaining</div>
                    <div className="font-title-lg text-title-lg text-primary font-bold">{grandRemainingLessons}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
