import React, { useState, useCallback, useEffect } from 'react';
import { generateLesson, extractTopicsFromFile, extractTopicsFromKhanAcademy, generateMoreExamples } from './services/geminiService';
import type { Lesson, ActiveTab, TopicSource, LessonRecord, UserProgress, Mistake, Subject } from './types';
import { loadProgress, saveProgress, calculateStats } from './utils/progress';
import LoadingSpinner from './components/LoadingSpinner';
import Quiz from './components/Quiz';
import PracticeProblems from './components/PracticeProblems';
import Dashboard from './components/Dashboard';

const LessonContent: React.FC<{
    lesson: Lesson;
    onGenerateMoreExamples: () => void;
    isGeneratingExamples: boolean;
}> = ({ lesson, onGenerateMoreExamples, isGeneratingExamples }) => (
  <div className="space-y-8">
    <div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{lesson.coreConcept.title}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{lesson.coreConcept.explanation}</p>
    </div>
    <div>
        <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Real World Examples</h4>
        <div className="mt-4 space-y-4">
            {lesson.coreConcept.realWorldExamples.map((ex, index) => (
                <div key={index} className="p-4 border-l-4 border-brand-500 bg-brand-50 dark:bg-brand-900/50 rounded-r-lg">
                    <p className="font-semibold text-brand-800 dark:text-brand-200">{ex.example}</p>
                    <p className="mt-1 text-brand-700 dark:text-brand-300">{ex.explanation}</p>
                </div>
            ))}
        </div>
        <div className="mt-4">
            <button
                onClick={onGenerateMoreExamples}
                disabled={isGeneratingExamples}
                className="px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-200 bg-brand-200 dark:bg-brand-800 rounded-md hover:bg-brand-300 dark:hover:bg-brand-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 disabled:cursor-wait transition-colors"
            >
                {isGeneratingExamples ? 'Generating...' : 'I need another example'}
            </button>
        </div>
    </div>
  </div>
);

type Result = { score: number; total: number; timeTaken: number };

const ResultsSummary: React.FC<{ quizResult: Result; problemsResult: Result }> = ({ quizResult, problemsResult }) => {
    const totalScore = quizResult.score + problemsResult.score;
    const totalQuestions = quizResult.total + problemsResult.total;
    const percentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    let feedback = '';
    if (percentage === 100) {
        feedback = "Perfect score! You're a wizard! ✨";
    } else if (percentage >= 80) {
        feedback = "Excellent work! You've really mastered this topic.";
    } else if (percentage >= 60) {
        feedback = "Great effort! A little more practice and you'll be an expert.";
    } else {
        feedback = "Good start! Review the lesson and try the problems again to strengthen your understanding.";
    }

    return (
        <div className="p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 rounded-r-lg animate-fade-in">
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Lesson Complete!</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <p className="text-yellow-700 dark:text-yellow-300">
                    Quiz Score: <strong>{quizResult.score} / {quizResult.total}</strong>
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                    Practice Problems Score: <strong>{problemsResult.score} / {problemsResult.total}</strong>
                </p>
            </div>
            <p className="mt-3 font-semibold text-yellow-800 dark:text-yellow-200">{feedback}</p>
        </div>
    );
};


const App: React.FC = () => {
  const [subject, setSubject] = useState<Subject>('Math');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<Lesson | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lesson');
  
  const [topicSource, setTopicSource] = useState<TopicSource>('manual');
  const [selectedTopic, setSelectedTopic] = useState<string>('Calculating Percentages');
  const [extractedTopics, setExtractedTopics] = useState<string[] | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [quizResult, setQuizResult] = useState<Result | null>(null);
  const [problemsResult, setProblemsResult] = useState<Result | null>(null);
  const [quizMistakes, setQuizMistakes] = useState<Mistake[] | null>(null);
  const [problemsMistakes, setProblemsMistakes] = useState<Mistake[] | null>(null);
  const [isGeneratingExamples, setIsGeneratingExamples] = useState<boolean>(false);

  const [userProgress, setUserProgress] = useState<UserProgress>({ records: [] });
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const progressStats = React.useMemo(() => calculateStats(userProgress.records), [userProgress]);

  const resetState = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLessonData(null);
    setExtractedTopics(null);
    setParseError(null);
    setIsParsing(false);
    setQuizResult(null);
    setProblemsResult(null);
    setQuizMistakes(null);
    setProblemsMistakes(null);
  }, []);

  const handleSubjectChange = (newSubject: Subject) => {
    setSubject(newSubject);
    setSelectedTopic(newSubject === 'Math' ? 'Calculating Percentages' : 'The Water Cycle');
    resetState();
  };

  useEffect(() => {
    setUserProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (quizResult && problemsResult && lessonData && quizMistakes !== null && problemsMistakes !== null) {
        const today = new Date().toISOString().split('T')[0];
        
        const newRecord: LessonRecord = {
            date: today,
            topic: lessonData.topic,
            quizScore: quizResult.score,
            quizTotal: quizResult.total,
            quizTimeTaken: quizResult.timeTaken,
            problemsScore: problemsResult.score,
            problemsTotal: problemsResult.total,
            problemsTimeTaken: problemsResult.timeTaken,
            mistakes: [...quizMistakes, ...problemsMistakes],
        };

        const updatedProgress = {
            ...userProgress,
            records: [...userProgress.records, newRecord]
        };

        setUserProgress(updatedProgress);
        saveProgress(updatedProgress);
    }
  }, [quizResult, problemsResult, lessonData, quizMistakes, problemsMistakes]);


  const handleTopicSourceChange = (source: TopicSource) => {
    setTopicSource(source);
    setExtractedTopics(null);
    setParseError(null);
    setLessonData(null);
    setError(null);
    if (source === 'manual') {
      setSelectedTopic(subject === 'Math' ? 'Calculating Percentages' : 'The Water Cycle');
    } else {
      setSelectedTopic('');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setExtractedTopics(null);
    setSelectedTopic('');
    setLessonData(null);

    try {
      const topics = await extractTopicsFromFile(file, subject);
      setExtractedTopics(topics);
      if (topics.length > 0) {
        setSelectedTopic(topics[0]);
      }
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse file.');
    } finally {
      setIsParsing(false);
    }
  };
  
  const handleKhanParse = async () => {
    setIsParsing(true);
    setParseError(null);
    setExtractedTopics(null);
    setSelectedTopic('');
    setLessonData(null);
    
    try {
      const topics = await extractTopicsFromKhanAcademy(subject);
      setExtractedTopics(topics);
      if (topics.length > 0) {
        setSelectedTopic(topics[0]);
      }
    } catch (err: any) {
      setParseError(err.message || 'Failed to load topics.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateLesson = useCallback(async () => {
    if (!selectedTopic.trim()) {
      setError('Please enter or select a topic.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setLessonData(null);
    setQuizResult(null);
    setProblemsResult(null);
    setQuizMistakes(null);
    setProblemsMistakes(null);
    try {
      const data = await generateLesson(selectedTopic, subject);
      setLessonData(data);
      setActiveTab('lesson');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopic, subject]);

  const handleGenerateMoreExamples = async () => {
    if (!lessonData) return;

    setIsGeneratingExamples(true);
    try {
        const newExamples = await generateMoreExamples(lessonData.topic, subject, lessonData.coreConcept.realWorldExamples);
        
        const updatedLessonData: Lesson = {
            ...lessonData,
            coreConcept: {
                ...lessonData.coreConcept,
                realWorldExamples: [
                    ...lessonData.coreConcept.realWorldExamples,
                    ...newExamples
                ]
            }
        };
        setLessonData(updatedLessonData);
    } catch (err: any) {
        console.error("Failed to fetch more examples:", err.message);
    } finally {
        setIsGeneratingExamples(false);
    }
  };

  const TopicSourceButton = ({ tab, label }: { tab: TopicSource; label: string }) => (
    <button
      onClick={() => handleTopicSourceChange(tab)}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
        topicSource === tab
          ? 'border-brand-500 text-brand-600 dark:text-brand-400'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      }`}
      aria-current={topicSource === tab ? 'page' : undefined}
    >
      {label}
    </button>
  );

  const LessonTabButton = ({ tab, label }: { tab: ActiveTab; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tab
          ? 'bg-brand-600 text-white'
          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
  
  const SubjectButton: React.FC<{ value: Subject, label: string }> = ({ value, label }) => (
    <button
      onClick={() => handleSubjectChange(value)}
      className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out ${
        subject === value 
          ? 'bg-brand-600 text-white shadow-md' 
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {isDashboardOpen && <Dashboard progress={userProgress} stats={progressStats} onClose={() => setIsDashboardOpen(false)} />}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand-600 dark:text-brand-400">Alge-Bro</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Instant, engaging 7th-grade {subject} lessons.</p>
          </div>
          <button 
             onClick={() => setIsDashboardOpen(true)}
             className="px-4 py-2 bg-yellow-400 text-yellow-900 font-semibold rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-colors"
           >
            Dashboard
           </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 sm:mb-0">1. Select a Subject</h2>
              <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-full">
                <SubjectButton value="Math" label="📐 Math" />
                <SubjectButton value="Science" label="🔬 Science" />
              </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">2. Choose a Topic</h2>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                <TopicSourceButton tab="manual" label="Enter Topic" />
                <TopicSourceButton tab="upload" label="Upload Syllabus" />
                <TopicSourceButton tab="khan" label="Khan Academy" />
              </nav>
            </div>
            
            <div className="min-h-[120px] pt-4">
              {topicSource === 'manual' && (
                <div className="flex flex-col sm:flex-row gap-4">
                   <input
                    type="text"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    placeholder={subject === 'Math' ? 'E.g., Pythagorean Theorem, Ratios...' : 'E.g., Photosynthesis, Plate Tectonics...'}
                    className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition dark:bg-gray-700"
                  />
                </div>
              )}
              {topicSource === 'upload' && (
                 <div>
                    <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      Choose a curriculum file (.pdf, .txt)
                    </label>
                    <input id="file-upload" type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md"/>
                    <p className="text-xs text-gray-500 mt-2">Upload a syllabus to automatically extract topics.</p>
                </div>
              )}
              {topicSource === 'khan' && (
                 <div>
                   <button onClick={handleKhanParse} disabled={isParsing} className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-md hover:bg-brand-700 disabled:bg-brand-400">
                      {isParsing ? 'Loading...' : `Load Khan Academy ${subject} Topics`}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Generate a topic list based on the 7th Grade Khan Academy {subject} syllabus.</p>
                </div>
              )}
              {isParsing && <div className="mt-4"><LoadingSpinner /></div>}
              {parseError && <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert"><p>{parseError}</p></div>}
              {extractedTopics && extractedTopics.length > 0 && (
                  <div className="mt-4 animate-fade-in">
                      <label htmlFor="topic-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select a topic:</label>
                      <select id="topic-select" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition dark:bg-gray-700">
                          {extractedTopics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                      </select>
                  </div>
              )}
            </div>
          </div>


          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">3. Generate Your Lesson</h2>
            <button
                onClick={handleGenerateLesson}
                disabled={isLoading || !selectedTopic.trim()}
                className="w-full sm:w-auto px-8 py-3 bg-brand-600 text-white font-semibold rounded-md hover:bg-brand-700 disabled:bg-brand-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                {isLoading ? 'Generating Lesson...' : 'Generate Lesson'}
            </button>
          </div>
        </div>

        <div className="mt-8">
          {isLoading && !lessonData && <LoadingSpinner />}
          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
          
          {lessonData && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg animate-fade-in">
              {quizResult && problemsResult && (
                <ResultsSummary quizResult={quizResult} problemsResult={problemsResult} />
              )}
              
              <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">{lessonData.topic}</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{lessonData.introduction}</p>

              <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex space-x-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                  <LessonTabButton tab="lesson" label="Lesson" />
                  <LessonTabButton tab="quiz" label="Quiz" />
                  <LessonTabButton tab="problems" label="Practice Problems" />
                </div>
              </div>

              <div>
                {activeTab === 'lesson' && <LessonContent lesson={lessonData} onGenerateMoreExamples={handleGenerateMoreExamples} isGeneratingExamples={isGeneratingExamples} />}
                {activeTab === 'quiz' && <Quiz quizData={lessonData.quiz} onComplete={(score, total, timeTaken, mistakes) => { setQuizResult({ score, total, timeTaken }); setQuizMistakes(mistakes); }} />}
                {activeTab === 'problems' && <PracticeProblems problemsData={lessonData.practiceProblems} onComplete={(score, total, timeTaken, mistakes) => { setProblemsResult({ score, total, timeTaken }); setProblemsMistakes(mistakes); }} />}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;