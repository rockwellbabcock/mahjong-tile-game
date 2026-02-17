import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "mahjong-lessons-progress";
const FREE_DAILY_LIMIT = 3;

export interface LessonProgress {
  completedLessons: Record<string, number>;
  dailyCount: number;
  dailyResetDate: string;
  isPremium: boolean;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function loadProgress(): LessonProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LessonProgress;
      if (parsed.dailyResetDate !== getTodayStr()) {
        parsed.dailyCount = 0;
        parsed.dailyResetDate = getTodayStr();
      }
      return parsed;
    }
  } catch {}
  return {
    completedLessons: {},
    dailyCount: 0,
    dailyResetDate: getTodayStr(),
    isPremium: false,
  };
}

function saveProgress(progress: LessonProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useLessons() {
  const [progress, setProgress] = useState<LessonProgress>(loadProgress);

  useEffect(() => {
    const today = getTodayStr();
    if (progress.dailyResetDate !== today) {
      const updated = { ...progress, dailyCount: 0, dailyResetDate: today };
      setProgress(updated);
      saveProgress(updated);
    }
  }, []);

  const effectiveCount = progress.dailyResetDate === getTodayStr() ? progress.dailyCount : 0;
  const remainingToday = progress.isPremium
    ? Infinity
    : Math.max(0, FREE_DAILY_LIMIT - effectiveCount);

  const getEffectiveDailyCount = useCallback((): number => {
    if (progress.dailyResetDate !== getTodayStr()) return 0;
    return progress.dailyCount;
  }, [progress]);

  const canAccessLesson = useCallback(
    (lessonId: string): boolean => {
      if (progress.isPremium) return true;
      if (progress.completedLessons[lessonId] !== undefined) return true;
      return getEffectiveDailyCount() < FREE_DAILY_LIMIT;
    },
    [progress, getEffectiveDailyCount]
  );

  const startLesson = useCallback(
    (lessonId: string): boolean => {
      if (!canAccessLesson(lessonId)) return false;
      const today = getTodayStr();
      const updated = { ...progress };
      if (updated.dailyResetDate !== today) {
        updated.dailyCount = 0;
        updated.dailyResetDate = today;
      }
      if (updated.completedLessons[lessonId] === undefined) {
        updated.dailyCount += 1;
      }
      setProgress(updated);
      saveProgress(updated);
      return true;
    },
    [progress, canAccessLesson]
  );

  const completeLesson = useCallback(
    (lessonId: string, score: number) => {
      const updated = { ...progress };
      const prev = updated.completedLessons[lessonId] || 0;
      updated.completedLessons[lessonId] = Math.max(prev, score);
      setProgress(updated);
      saveProgress(updated);
    },
    [progress]
  );

  const completedCount = Object.keys(progress.completedLessons).length;

  return {
    progress,
    remainingToday,
    canAccessLesson,
    startLesson,
    completeLesson,
    completedCount,
    isPremium: progress.isPremium,
    freeDailyLimit: FREE_DAILY_LIMIT,
  };
}
