import React, { useState, useEffect, useCallback } from 'react';
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
import { BookOpen, HelpCircle, Activity, Brain, FileUp, List, Sparkles, BarChart2 } from 'lucide-react';

// Fix: Inlined the AIStudio interface to prevent global type declaration issues.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  // API Key State
  const [isKeyReady, setIsKeyReady] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);


  // State
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lesson');

  // Topic Generation State
  const [topicInput, setTopicInput] = useState<string>('');
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
    const checkApiKey = async () => {
      try {
        if (await window.aistudio.hasSelectedApiKey()) {
          setIsKeyReady(true);
        }
      } catch (e) {
        console.error("Error checking for API key:", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkApiKey();
  }, []);
  
  useEffect(() => {
    if (!isKeyReady) return;
    const loadedProgress = loadProgress();
    setUserProgress(loadedProgress);
    setProgressStats(calculateStats(loadedProgress.records));
  }, [isKeyReady]);

  // Save progress when a lesson is fully completed (quiz + problems)
  useEffect(() => {
    if (lesson && quizResults && problemsResults) {
      const newRecord: LessonRecord = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        topic: `${lesson.topic} (${subject})`,
        quizScore: quizResults.score,
        quizTotal: quizResults.total,
        quizTimeTaken: quizResults.time,
        problemsScore: problemsResults.score,
        problemsTotal: problemsResults.total,
        problemsTimeTaken: problemsResults.time,
        mistakes: [...quizResults.mistakes, ...problemsResults.mistakes],
      };

      const updatedProgress = {
        ...userProgress,
        records: [...userProgress.records, newRecord],
      };

      saveProgress(updatedProgress);
      setUserProgress(updatedProgress);
      setProgressStats(calculateStats(updatedProgress.records));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemsResults]); // Trigger when problems are finished


  // Handlers
  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      setIsKeyReady(true);
    } catch (e) {
      setError("Could not select API key. Please try again.");
    }
  };
  
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
      if (err instanceof Error && err.message.includes("API_KEY")) {
          setError(err.message);
          setIsKeyReady(false);
      } else {
        setError((err as Error).message);
      }
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
      if (err instanceof Error && err.message.includes("API_KEY")) {
          setError(err.message);
          setIsKeyReady(false);
      } else {
        setError((err as Error).message);
      }
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
      if (err instanceof Error && err.message.includes("API_KEY")) {
          setError(err.message);
          setIsKeyReady(false);
      } else {
        setError((err as Error).message);
      }
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
        if (err instanceof Error && err.message.includes("API_KEY")) {
            setError(err.message);
            setIsKeyReady(false);
        } else {
            setError((err as Error).message);
        }
      } finally {
          setIsGeneratingExamples(false);
      }
  }

  const handleSubjectChange = (newSubject: Subject) => {
    setSubject(newSubject);
    setTopicInput('');
    setExtractedTopics([]);
    setLesson(null);
    setError(null);
  }

  const renderApiKeyScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center p-4">
        <h1 className="text-4xl font-bold text-brand-600 dark:text-brand-400 mb-2">Welcome to Alge-Bro!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">Your friendly Math & Science buddy.</p>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Connect Your API Key</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">To start generating lessons, you'll need to select your Google AI API key. This is a one-time setup.</p>
            <button
                onClick={handleSelectKey}
                className="w-full px-6 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-transform transform hover:scale-105"
            >
                Select API Key
            </button>
             {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        </div>
    </div>
  );

  if (isCheckingKey) {
    return <LoadingSpinner />;
  }

  if (!isKeyReady) {
      return renderApiKeyScreen();
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 font-sans text-gray-800 dark:text-gray-200">
      {isDashboardOpen && <Dashboard progress={userProgress} stats={progressStats} onClose={() => setIsDashboardOpen(false)} />}
      
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-brand-600 dark:text-brand-400">Alge-Bro</h1>
          <p className="text-gray-500 dark:text-gray-400">Your friendly {subject} buddy.</p>
        </div>
        <button 
          onClick={() => setIsDashboardOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Open Progress Dashboard"
        >
          <BarChart2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <span className="hidden sm:inline font-medium">Dashboard</span>
        </button>
      </header>
      
      <main className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="space-y-6">
          {/* Subject Selector */}
          <div className="flex justify-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {(['Math', 'Science'] as Subject[]).map(s => (
              <button key={s} onClick={() => handleSubjectChange(s)} className={`w-full py-2 px-4 rounded-md font-semibold transition-colors text-sm sm:text-base ${subject === s ? 'bg-brand-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{s}</button>
            ))}
          </div>
          
          {/* Topic Source Selector */}
          <div className="flex border-b border-gray-200 dark:border-gray-600">
              {(['manual', 'upload', 'khan'] as TopicSource[]).map(source => (
                  <button key={source} onClick={() => setTopicSource(source)} className={`px-4 py-2 text-sm sm:text-base font-medium border-b-2 transition-colors ${topicSource === source ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                      {source === 'manual' && 'Enter Topic'}
                      {source === 'upload' && 'Upload Syllabus'}
                      {source === 'khan' && 'Khan Academy'}
                  </button>
              ))}
          </div>

          {/* Topic Input Area */}
          <div>
            {topicSource === 'manual' && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder={`e.g., Photosynthesis`} className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-500 dark:bg-gray-700"/>
                    <button onClick={() => handleGenerateLesson(topicInput)} disabled={isLoading || isGeneratingTopics} className="px-6 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 disabled:bg-brand-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                        <Sparkles className="w-5 h-5 mr-2" /> Generate Lesson
                    </button>
                </div>
            )}
            {topicSource === 'upload' && (
                <div className="text-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <label htmlFor="file-upload" className="cursor-pointer text-brand-600 dark:text-brand-400 font-medium hover:underline">
                        <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <span>Choose a syllabus file (PDF, TXT)</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".pdf,.txt,.md" />
                    </label>
                </div>
            )}
            {topicSource === 'khan' && (
                 <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="mb-4 text-gray-600 dark:text-gray-300">Get a list of 7th grade {subject} topics from the Khan Academy curriculum.</p>
                    <button onClick={handleKhanTopics} className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                        <List className="w-5 h-5 mr-2 inline" /> Load Khan Academy Topics
                    </button>
                </div>
            )}
          </div>
          
          {(isGeneratingTopics || extractedTopics.length > 0) && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {isGeneratingTopics ? <LoadingSpinner /> : (
                      <>
                          <h3 className="font-bold mb-2">Select a Topic:</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {extractedTopics.map(topic => (
                                  <button key={topic} onClick={() => { setTopicInput(topic); handleGenerateLesson(topic); }} className="p-2 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/50 hover:border-brand-400 transition-colors">
                                      {topic}
                                  </button>
                              ))}
                          </div>
                      </>
                  )}
              </div>
          )}
        </div>
      </main>

      {error && (
        <div className="my-6 p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 rounded-r-lg">
            <p className="font-bold">Oops! Something went wrong.</p>
            <p className="text-sm">{error}</p>
             {error.includes("API_KEY") && <button onClick={handleSelectKey} className="mt-2 text-sm font-semibold underline">Select API Key Again</button>}
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      
      {lesson && (
          <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in">
              <h2 className="text-3xl font-bold mb-4">{lesson.topic}</h2>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-6 flex space-x-2 sm:space-x-4">
                  {(['lesson', 'quiz', 'problems'] as ActiveTab[]).map((tab, index) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} disabled={index > 0 && !quizResults && tab === 'problems'} className={`flex items-center space-x-2 pb-2 px-1 border-b-4 text-sm sm:text-base font-medium transition-colors ${activeTab === tab ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed'}`}>
                          {tab === 'lesson' && <BookOpen />}
                          {tab === 'quiz' && <HelpCircle />}
                          {tab === 'problems' && <Activity />}
                          <span className="capitalize">{tab}</span>
                      </button>
                  ))}
              </div>

              {quizResults && problemsResults && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-200">🎉 Lesson Complete!</h3>
                      <div className="flex flex-wrap gap-4 mt-2">
                           <p>Quiz: <span className="font-semibold">{quizResults.score}/{quizResults.total}</span></p>
                           <p>Problems: <span className="font-semibold">{problemsResults.score}/{problemsResults.total}</span></p>
                      </div>
                  </div>
              )}

              {activeTab === 'lesson' && (
                <div className="space-y-6 prose prose-lg dark:prose-invert max-w-none">
                    <p>{lesson.introduction}</p>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <h3 className="flex items-center space-x-2 font-bold"><Brain /> <span>{lesson.coreConcept.title}</span></h3>
                        <p>{lesson.coreConcept.explanation}</p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-2">Real-World Examples</h4>
                        <div className="space-y-4">
                            {lesson.coreConcept.realWorldExamples.map((ex, i) => (
                                <div key={i} className="p-3 bg-brand-50 dark:bg-brand-900/30 border-l-4 border-brand-400 rounded-r-md">
                                    <p className="font-semibold">{ex.example}</p>
                                    <p className="text-sm">{ex.explanation}</p>
                                </div>
                            ))}
                        </div>
                         <button onClick={handleMoreExamples} disabled={isGeneratingExamples} className="mt-4 px-4 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium rounded-lg transition-colors disabled:opacity-50">
                            {isGeneratingExamples ? 'Thinking...' : 'I need another example'}
                        </button>
                    </div>
                </div>
              )}
              {activeTab === 'quiz' && <Quiz quizData={lesson.quiz} onComplete={handleQuizComplete} />}
              {activeTab === 'problems' && <PracticeProblems problemsData={lesson.practiceProblems} onComplete={handleProblemsComplete} />}

          </div>
      )}
    </div>
  );
};

export default App;
