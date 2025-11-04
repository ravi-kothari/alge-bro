import type { UserProgress, ProgressStats, LessonRecord } from '../types';

const PROGRESS_STORAGE_KEY = 'algebro-user-progress';
const API_KEY_STORAGE_KEY = 'algebro-api-key';

// --- API Key Management ---
export const saveApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (err) {
    console.error("Could not save API key:", err);
  }
};

export const loadApiKey = (): string | null => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (err) {
    console.error("Could not load API key:", err);
    return null;
  }
};


// --- User Progress Management ---
export const loadUserProgress = (): UserProgress => {
  try {
    const serializedState = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (serializedState === null) {
      return { records: [] };
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error("Could not load user progress:", err);
    return { records: [] };
  }
};

export const saveUserProgress = (progress: UserProgress): void => {
  try {
    const serializedState = JSON.stringify(progress);
    localStorage.setItem(PROGRESS_STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save user progress:", err);
  }
};

export const addLessonRecord = (record: LessonRecord): UserProgress => {
    const progress = loadUserProgress();
    const updatedRecords = [...progress.records, record];
    const updatedProgress = { ...progress, records: updatedRecords };
    saveUserProgress(updatedProgress);
    return updatedProgress;
};


export const calculateProgressStats = (progress: UserProgress): ProgressStats => {
  const { records } = progress;
  const lessonsCompleted = records.length;

  if (lessonsCompleted === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lessonsCompleted: 0,
      averageScore: 0,
    };
  }

  // Calculate Average Score
  const totalScore = records.reduce((acc, r) => acc + r.quizScore + r.problemsScore, 0);
  const totalPossible = records.reduce((acc, r) => acc + r.quizTotal + r.problemsTotal, 0);
  const averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  // Calculate Streaks
  const uniqueDates = [...new Set(records.map(r => new Date(r.date).setHours(0,0,0,0)))].sort((a,b) => a - b);

  let currentStreak = 0;
  let longestStreak = 0;

  if (uniqueDates.length > 0) {
      longestStreak = 1;
      currentStreak = 1;
      
      const today = new Date().setHours(0,0,0,0);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTime = yesterday.setHours(0,0,0,0);
      
      const lastSessionDate = uniqueDates[uniqueDates.length - 1];

      if (lastSessionDate === today || lastSessionDate === yesterdayTime) {
          for (let i = uniqueDates.length - 1; i > 0; i--) {
              const currentDate = uniqueDates[i];
              const prevDate = uniqueDates[i-1];
              
              const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

              if (dayDiff === 1) {
                  currentStreak++;
              } else {
                  break;
              }
          }
      } else {
        // Streak is broken if the last session wasn't today or yesterday
        currentStreak = 0;
      }
      
      // Calculate longest streak separately
      if (uniqueDates.length > 1) {
        let currentLongest = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const dayDiff = (uniqueDates[i] - uniqueDates[i - 1]) / (1000 * 60 * 60 * 24);
          if (dayDiff === 1) {
            currentLongest++;
          } else {
            longestStreak = Math.max(longestStreak, currentLongest);
            currentLongest = 1;
          }
        }
        longestStreak = Math.max(longestStreak, currentLongest);
      }
  }


  return {
    currentStreak,
    longestStreak,
    lessonsCompleted,
    averageScore,
  };
};