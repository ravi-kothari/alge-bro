import React, { useState, useEffect } from 'react';
import { generateLesson } from './services/geminiService';
import type { Lesson, ActiveTab, Subject, LessonRecord, Mistake, UserProgress, ProgressStats } from './types';
import Quiz from './components/Quiz';
import PracticeProblems from './components/PracticeProblems';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './components/Dashboard';
import { loadUserProgress, addLessonRecord, calculateProgressStats, saveApiKey, loadApiKey } from './utils/progress';

const ApiKeySetup: React.FC<{ onApiKeySet: () => void }> = ({ onApiKeySet }) => {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!apiKey.trim()) {
            setError('Please enter your API key.');
            return;
        }
        saveApiKey(apiKey);
        onApiKeySet();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="w-full max-w-md text-center">
                <h1 className="text-5xl font-bold text-brand-400 mb-2">Welcome to Alge-Bro!</h1>
                <p className="text-xl text-gray-300 mb-8">Your friendly Math & Science buddy.</p>
                <div className="bg-gray-800 p-8 rounded-lg shadow-2xl">
                    <h2 className="text-2xl font-bold mb-2">Connect Your API Key</h2>
                    <p className="text-gray-400 mb-4">
                        To start generating lessons, you'll need to provide your Google AI API key. This is a one-time setup and your key will be saved securely in your browser.
                    </p>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter your Google AI API key"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-brand-500 focus:border-brand-500"
                    />
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button
                        onClick={handleSubmit}
                        className="mt-4 w-full px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-500 transition-colors"
                    >
                        Save & Start Learning
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                        You can get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-400">Google AI Studio</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [apiKeySet, setApiKeySet] = useState<boolean>(false);
    
    // Check for API key on initial load
    useEffect(() => {
        if (loadApiKey()) {
            setApiKeySet(true);
        }
    }, []);

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('lesson');

    const [topic, setTopic] = useState<string>('');
    const [subject, setSubject] = useState<Subject>('Math');

    const [quizResult, setQuizResult] = useState<{ score: number; total: number; time: number; mistakes: Mistake[] } | null>(null);
    const [problemsResult, setProblemsResult] = useState<{ score: number; total: number; time: number; mistakes: Mistake[] } | null>(null);
    
    const [userProgress, setUserProgress] = useState<UserProgress>(loadUserProgress());
    const [progressStats, setProgressStats] = useState<ProgressStats>(calculateProgressStats(userProgress));
    const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);

    useEffect(() => {
        if (quizResult && problemsResult && lesson) {
            const newRecord: LessonRecord = {
                date: new Date().toISOString(),
                topic: lesson.topic,
                quizScore: quizResult.score,
                quizTotal: quizResult.total,
                quizTimeTaken: quizResult.time,
                problemsScore: problemsResult.score,
                problemsTotal: problemsResult.total,
                problemsTimeTaken: problemsResult.time,
                mistakes: [...quizResult.mistakes, ...problemsResult.mistakes],
            };
            const updatedProgress = addLessonRecord(newRecord);
            setUserProgress(updatedProgress);
            setProgressStats(calculateProgressStats(updatedProgress));
            
            setQuizResult(null);
            setProblemsResult(null);
        }
    }, [quizResult, problemsResult, lesson]);


    const handleGenerateLesson = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setLesson(null);
        setActiveTab('lesson');
        setQuizResult(null);
        setProblemsResult(null);
        
        try {
            const generatedLesson = await generateLesson(topic, subject);
            setLesson(generatedLesson);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuizComplete = (score: number, total: number, timeTaken: number, mistakes: Mistake[]) => {
        setQuizResult({ score, total, time: timeTaken, mistakes });
    };

    const handleProblemsComplete = (score: number, total: number, timeTaken: number, mistakes: Mistake[]) => {
        setProblemsResult({ score, total, time: timeTaken, mistakes });
    };

    const renderContent = () => {
        if (!lesson) return null;

        switch (activeTab) {
            case 'lesson':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{lesson.introduction}</h2>
                        </div>
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <h3 className="text-2xl font-semibold text-brand-600 dark:text-brand-400 mb-3">{lesson.coreConcept.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{lesson.coreConcept.explanation}</p>
                        </div>
                         <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <h3 className="text-2xl font-semibold text-brand-600 dark:text-brand-400 mb-4">Real-World Examples</h3>
                            <div className="space-y-4">
                                {lesson.coreConcept.realWorldExamples.map((ex, index) => (
                                    <div key={index} className="p-4 border-l-4 border-brand-500 bg-gray-50 dark:bg-gray-900/50 rounded-r-lg">
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{ex.example}</p>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">{ex.explanation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'quiz':
                return <Quiz quizData={lesson.quiz} onComplete={handleQuizComplete} />;
            case 'problems':
                return <PracticeProblems problemsData={lesson.practiceProblems} onComplete={handleProblemsComplete} />;
            default:
                return null;
        }
    };

    const isLessonComplete = quizResult && problemsResult;
    
    if (!apiKeySet) {
        return <ApiKeySetup onApiKeySet={() => setApiKeySet(true)} />;
    }

    return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-600 dark:text-brand-400">
                    🧑‍🏫 Alge-Bro
                </h1>
                <button onClick={() => setIsDashboardOpen(true)} className="px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    Dashboard ({progressStats.lessonsCompleted})
                </button>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-xl font-semibold mb-4">Generate a New Lesson</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                        <input
                            type="text"
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Quadratic Equations, Photosynthesis"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                        />
                    </div>
                     <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                        <select
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value as Subject)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option>Math</option>
                            <option>Science</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={handleGenerateLesson}
                    disabled={isLoading}
                    className="mt-4 w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-brand-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Generating...' : 'Create Lesson'}
                </button>
            </div>

            {isLoading && <LoadingSpinner />}
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md dark:bg-red-900/50 dark:text-red-300" role="alert"><p>{error}</p></div>}
            
            {lesson && !isLoading && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg animate-fade-in">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white border-b pb-4 mb-6">{lesson.topic}</h2>
                    <div className="mb-6">
                        <nav className="flex space-x-2 sm:space-x-4 border-b border-gray-200 dark:border-gray-700">
                            {['lesson', 'quiz', 'problems'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as ActiveTab)}
                                    className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base capitalize transition-colors border-b-2 ${
                                        activeTab === tab 
                                        ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    {tab}
                                    {tab === 'quiz' && quizResult && ' ✅'}
                                    {tab === 'problems' && problemsResult && ' ✅'}
                                </button>
                            ))}
                        </nav>
                    </div>
                    {renderContent()}
                    {isLessonComplete && (
                        <div className="mt-8 p-4 bg-green-100 dark:bg-green-900/50 border-l-4 border-green-500 rounded-md text-green-800 dark:text-green-200">
                            <h3 className="font-bold text-lg">Lesson Complete!</h3>
                            <p>Great job! Your progress has been saved. You can see your stats in the dashboard.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </main>
      
      {isDashboardOpen && <Dashboard progress={userProgress} stats={progressStats} onClose={() => setIsDashboardOpen(false)} />}
    </div>
  );
};

export default App;