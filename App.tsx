import React, { useState, useEffect } from 'react';
import {
  generateLesson,
  extractTopicsFromFile,
  extractTopicsFromKhanAcademy,
  generateMoreExamples
} from './services/geminiService';
import type {
  Lesson,
  ActiveTab,
  TopicSource,
  Subject,
  UserProgress,
  ProgressStats,
  LessonRecord,
  Mistake,
} from './types';
import { loadProgress, saveProgress, calculateStats } from './utils/progress';
import LoadingSpinner from './components/LoadingSpinner';
import Quiz from './components/Quiz';
import PracticeProblems from './components/PracticeProblems';
import Dashboard from './components/Dashboard';
import { BookOpen, HelpCircle, Activity, Brain, FileUp, List, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lesson');

  // Topic Generation State
  const [topicInput, setTopicInput] = useState<string>('Solving Linear Equations');
  const [subject, setSubject] = useState<Subject>('Math');
  const [topicSource, setTopicSource] = useState<TopicSource>('manual');
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState<boolean>(false);

  // Progress Tracking State
  const [userProgress, setUserProgress] = useState<UserProgress>({ records: [] });
  const [progressStats, setProgressStats] = useState<ProgressStats>({
    currentStreak: 0,
    longestStreak: 0,
    lessonsCompleted: 0,
    averageScore: 0
  });
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);

  // Lesson State
  const [quizResults, setQuizResults] = useState<{ score: number; total: number; time: number; mistakes: Mistake[] } | null>(null);
  const [problemsResults, setProblemsResults] = useState<{ score: number; total: number; time: number; mistakes: Mistake[] } | null>(null);
  const [isGeneratingExamples, setIsGeneratingExamples] = useState<boolean>(false);


  // Effects
  useEffect(() => {
    const loadedProgress = loadProgress();
    setUserProgress(loadedProgress);
    setProgressStats(calculateStats(loadedProgress.records));
  }, []);

  // Handlers
  const handleGenerateLesson = async (topic: string) => {
    if (!topic) {
      setError('Please enter a topic.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setLesson(null);
    setQuizResults(null);
    setProblemsResults(null);
    setActiveTab('lesson');
    try {
      const newLesson = await generateLesson(topic, subject);
      setLesson(newLesson);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setExtractedTopics([]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsGeneratingTopics(true);
    setError(null);
    setExtractedTopics([]);
    try {
      const topics = await extractTopicsFromFile(file, subject);
      setExtractedTopics(topics);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleKhanTopics = async () => {
    setIsGeneratingTopics(true);
    setError(null);
    setExtractedTopics([]);
    try {
      const topics = await extractTopicsFromKhanAcademy(subject);
      setExtractedTopics(topics);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGeneratingTopics(false);
    }
  };
  
  const handleQuizComplete = (score: number, total: number, timeTaken: number, mistakes: Mistake[]) => {
    setQuizResults({ score, total, time: timeTaken, mistakes });
  };
  
  const handleProblemsComplete = (score: number, total: number, timeTaken: number, mistakes: Mistake[]) => {
    setProblemsResults({ score, total, time: timeTaken, mistakes });
  };

  const handleMoreExamples = async () => {
      if (!lesson) return;
      setIsGeneratingExamples(true);
      try {
        const newExamples = await generateMoreExamples(
            lesson.topic, 
            subject, 
            lesson.coreConcept.realWorldExamples
        );
        setLesson(prevLesson => {
            if (!prevLesson) return null;
            return {
                ...prevLesson,
                coreConcept: {
                    ...prevLesson.coreConcept,
                    realWorldExamples: [...prevLesson.coreConcept.realWorldExamples, ...newExamples]
                }
            }
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
          setIsGeneratingExamples(false);
      }
  }

  // Save progress when a lesson is fully completed
  useEffect(() => {
    if (lesson && quizResults && problemsResults) {
      const newRecord: LessonRecord = {
        date: new Date().toISOString().split('T')[0],
        topic: lesson.topic,
        quizScore: quizResults.score,
        quizTotal: quizResults.total,
        quizTimeTaken: quizResults.time,
        problemsScore: problemsResults.score,
        problemsTotal: problemsResults.total,
        problemsTimeTaken: problemsResults.time,
        mistakes: [...quizResults.mistakes, ...problemsResults.mistakes],
      };

      setUserProgress(prevProgress => {
        const updatedRecords = [...prevProgress.records, newRecord];
        const newProgress = { records: updatedRecords };
        saveProgress(newProgress);
        setProgressStats(calculateStats(updatedRecords));
        return newProgress;
      });
    }
  }, [lesson, quizResults, problemsResults]);


  const resetLesson = () => {
    setLesson(null);
    setError(null);
    setTopicInput('Solving Linear Equations');
    setExtractedTopics([]);
    setQuizResults(null);
    setProblemsResults(null);
  };
  
  const TopicSelector = () => (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-brand-600 dark:text-brand-400">Alge-Bro</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Your AI-powered personal tutor.</p>
        </div>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Subject</label>
            <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                <option value="Math">Math</option>
                <option value="Science">Science</option>
            </select>
        </div>

        <div className="space-y-4">
            {/* Manual Topic Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What do you want to learn today?</label>
                <div className="flex">
                    <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder={`e.g., Photosynthesis`}
                    className="flex-grow p-2 border border-gray-300 rounded-l-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                    onClick={() => handleGenerateLesson(topicInput)}
                    className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-r-md hover:bg-brand-700"
                    >
                    Create Lesson
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-800 px-2 text-sm text-gray-500 dark:text-gray-400">Or get topic ideas</span>
                </div>
            </div>
            
            {/* Topic Generation Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label htmlFor="file-upload" className="cursor-pointer text-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors">
                    <FileUp className="mx-auto h-8 w-8 text-gray-400" />
                    <span className="mt-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Curriculum</span>
                    <input id="file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".pdf,.txt,.md" />
                </label>
                <button onClick={handleKhanTopics} className="text-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors">
                     <List className="mx-auto h-8 w-8 text-gray-400" />
                    <span className="mt-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Khan Academy Topics</span>
                </button>
            </div>
        </div>

        {isGeneratingTopics && <LoadingSpinner />}
        
        {extractedTopics.length > 0 && (
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Suggested Topics:</h3>
                <ul className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {extractedTopics.map((topic, index) => (
                    <li key={index}>
                    <button
                        onClick={() => handleGenerateLesson(topic)}
                        className="w-full text-left p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-brand-100 dark:hover:bg-brand-900/50"
                    >
                        {topic}
                    </button>
                    </li>
                ))}
                </ul>
            </div>
        )}
    </div>
  );

  const LessonView = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{lesson!.topic}</h2>
        
        <div>
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <BookOpen className="mr-2" /> Introduction
            </h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{lesson!.introduction}</p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h3 className="text-2xl font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                <Brain className="mr-2" /> Core Concept: {lesson!.coreConcept.title}
            </h3>
            <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">{lesson!.coreConcept.explanation}</p>
            
            <div className="mt-4">
                <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">Real-World Examples</h4>
                <ul className="space-y-2">
                    {lesson!.coreConcept.realWorldExamples.map((ex, index) => (
                        <li key={index} className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                            <p className="font-semibold text-gray-800 dark:text-white">{ex.example}</p>
                            <p className="text-gray-600 dark:text-gray-400">{ex.explanation}</p>
                        </li>
                    ))}
                </ul>
                <button 
                  onClick={handleMoreExamples}
                  disabled={isGeneratingExamples}
                  className="mt-4 px-4 py-2 text-sm bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-200 font-semibold rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700/50 transition-colors flex items-center"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGeneratingExamples ? "Generating..." : "Give me more examples!"}
                </button>
            </div>
        </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-8">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Creating your personalized lesson... this might take a moment!</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-xl mx-auto text-center p-8 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">Oops! Something went wrong.</h2>
            <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
            <button
                onClick={resetLesson}
                className="mt-6 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
            >
                Try Again
            </button>
        </div>
      );
    }
    
    if (!lesson) {
      return <TopicSelector />;
    }

    // Lesson is loaded, show tabs and content
    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton name="lesson" icon={<BookOpen />} label="Lesson" />
                    <TabButton name="quiz" icon={<HelpCircle />} label="Quiz" disabled={!!quizResults} />
                    <TabButton name="problems" icon={<Activity />} label="Problems" disabled={!quizResults || !!problemsResults}/>
                </nav>
            </div>
            
            {activeTab === 'lesson' && <LessonView />}
            {activeTab === 'quiz' && <Quiz quizData={lesson.quiz} onComplete={handleQuizComplete} />}
            {activeTab === 'problems' && <PracticeProblems problemsData={lesson.practiceProblems} onComplete={handleProblemsComplete} />}
        </div>
    );
  };
  
  const TabButton = ({ name, icon, label, disabled = false }: { name: ActiveTab, icon: React.ReactNode, label: string, disabled?: boolean }) => {
    const isActive = activeTab === name;
    return (
      <button
        onClick={() => !disabled && setActiveTab(name)}
        className={`
          ${isActive ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors
        `}
      >
        {React.cloneElement(icon as React.ReactElement, { className: 'mr-2 h-5 w-5' })}
        {label}
      </button>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100">
      <header className="py-4 px-6 flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center">
            {lesson ? (
                <button onClick={resetLesson} className="text-lg font-bold text-brand-600 dark:text-brand-400 hover:underline">Alge-Bro</button>
            ) : (
                <h1 className="text-lg font-bold text-brand-600 dark:text-brand-400">Alge-Bro</h1>
            )}
        </div>
        <button
            onClick={() => setIsDashboardOpen(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
        >
            My Progress
        </button>
      </header>

      <main className="p-4 sm:p-6 md:p-8 flex justify-center">
        {renderContent()}
      </main>
      
      {isDashboardOpen && (
          <Dashboard 
            progress={userProgress} 
            stats={progressStats} 
            onClose={() => setIsDashboardOpen(false)} 
          />
      )}
    </div>
  );
};

export default App;
