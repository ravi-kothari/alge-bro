import type { LessonRecord, UserProgress, ProgressStats } from '../types';

const PROGRESS_KEY = 'mathAppUserProgress';

// Utility to check if two dates are on consecutive days
const areConsecutiveDays = (date1: Date, date2: Date): boolean => {
    const oneDay = 24 * 60 * 60 * 1000;
    // Set hours to 0 to avoid timezone issues
    const d1 = new Date(date1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(date2);
    d2.setHours(0, 0, 0, 0);
    return Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay)) === 1;
};

// Utility to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

export const loadProgress = (): UserProgress => {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    if (data) {
      return JSON.parse(data) as UserProgress;
    }
  } catch (error) {
    console.error("Failed to load progress:", error);
  }
  return { records: [] };
};

export const saveProgress = (progress: UserProgress): void => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
};

export const calculateStats = (records: LessonRecord[]): ProgressStats => {
    if (records.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lessonsCompleted: 0, averageScore: 0 };
    }

    const uniqueDays = [...new Set(records.map(r => r.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const uniqueDates = uniqueDays.map(d => new Date(d));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak
    if (uniqueDates.length > 0) {
        const today = new Date();
        const latestRecordDate = uniqueDates[0];
        
        if (isSameDay(today, latestRecordDate) || areConsecutiveDays(today, latestRecordDate)) {
             currentStreak = 1;
             for (let i = 0; i < uniqueDates.length - 1; i++) {
                 if (areConsecutiveDays(uniqueDates[i], uniqueDates[i+1])) {
                     currentStreak++;
                 } else {
                     break;
                 }
             }
        }
    }
    
    // Calculate longest streak
    if (uniqueDates.length > 0) {
        longestStreak = 1;
        tempStreak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            if (areConsecutiveDays(uniqueDates[i], uniqueDates[i+1])) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }
        }
    } else {
        longestStreak = 0;
    }


    const lessonsCompleted = records.length;

    const totalScore = records.reduce((acc, r) => acc + r.quizScore + r.problemsScore, 0);
    const totalPossible = records.reduce((acc, r) => acc + r.quizTotal + r.problemsTotal, 0);
    const averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    
    return { currentStreak, longestStreak, lessonsCompleted, averageScore };
};
