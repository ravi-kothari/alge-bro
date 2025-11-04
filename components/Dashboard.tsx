import React, { useState } from 'react';
import type { UserProgress, ProgressStats, LessonRecord } from '../types';

interface DashboardProps {
    progress: UserProgress;
    stats: ProgressStats;
    onClose: () => void;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: string }> = ({ label, value, icon }) => (
    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex items-center">
        <div className="text-3xl mr-4">{icon}</div>
        <div>
            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">{label}</div>
            <div className="text-gray-800 dark:text-white text-2xl font-bold">{value}</div>
        </div>
    </div>
);

const LessonRecordItem: React.FC<{ record: LessonRecord }> = ({ record }) => {
    const [isMistakesOpen, setIsMistakesOpen] = useState(false);
    
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <p className="font-bold text-gray-800 dark:text-white">{record.topic}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(record.date).toLocaleDateString()}</p>
                </div>
                <div className="flex space-x-4 mt-2 sm:mt-0 text-sm text-center">
                    <div>
                        <div className="font-semibold">{record.quizScore}/{record.quizTotal}</div>
                        <div className="text-xs text-gray-500">Quiz</div>
                    </div>
                    <div>
                        <div className="font-semibold">{formatTime(record.quizTimeTaken)}</div>
                        <div className="text-xs text-gray-500">Time</div>
                    </div>
                    <div className="border-l border-gray-200 dark:border-gray-600"></div>
                    <div>
                        <div className="font-semibold">{record.problemsScore}/{record.problemsTotal}</div>
                        <div className="text-xs text-gray-500">Problems</div>
                    </div>
                    <div>
                        <div className="font-semibold">{formatTime(record.problemsTimeTaken)}</div>
                        <div className="text-xs text-gray-500">Time</div>
                    </div>
                </div>
            </div>
            {record.mistakes && record.mistakes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={() => setIsMistakesOpen(!isMistakesOpen)} className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
                        {isMistakesOpen ? 'Hide' : 'Review'} {record.mistakes.length} Mistake(s)
                    </button>
                    {isMistakesOpen && (
                        <div className="mt-2 space-y-2 text-sm">
                            {record.mistakes.map((mistake, index) => (
                                <div key={index} className="p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{mistake.questionText}</p>
                                    <p>Your Answer: <span className="font-mono text-red-700 dark:text-red-300">{mistake.userAnswer}</span></p>
                                    <p>Correct Answer: <span className="font-mono text-green-700 dark:text-green-300">{mistake.correctAnswer}</span></p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ progress, stats, onClose }) => {

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const handleGenerateReport = () => {
        const reportHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Alge-Bro Progress Report</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .no-print { display: none; }
                        .page-break { page-break-before: always; }
                    }
                </style>
            </head>
            <body class="bg-gray-100 font-sans">
                <div class="container mx-auto p-4 sm:p-6 lg:p-8">
                    <header class="mb-8 text-center">
                        <h1 class="text-4xl font-bold text-blue-600">Alge-Bro Progress Report</h1>
                        <p class="text-gray-600">Generated on: ${new Date().toLocaleDateString()}</p>
                    </header>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-white p-6 rounded-xl shadow">
                         <div class="text-center p-4">
                            <div class="text-4xl">🔥</div>
                            <div class="text-gray-500 text-sm font-medium mt-1">Winning Streak</div>
                            <div class="text-2xl font-bold">${stats.currentStreak} days</div>
                        </div>
                        <div class="text-center p-4">
                            <div class="text-4xl">🏆</div>
                            <div class="text-gray-500 text-sm font-medium mt-1">Longest Streak</div>
                            <div class="text-2xl font-bold">${stats.longestStreak} days</div>
                        </div>
                        <div class="text-center p-4">
                            <div class="text-4xl">📚</div>
                            <div class="text-gray-500 text-sm font-medium mt-1">Lessons Done</div>
                            <div class="text-2xl font-bold">${stats.lessonsCompleted}</div>
                        </div>
                        <div class="text-center p-4">
                            <div class="text-4xl">🎯</div>
                            <div class="text-gray-500 text-sm font-medium mt-1">Average Score</div>
                            <div class="text-2xl font-bold">${stats.averageScore}%</div>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-xl shadow">
                        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
                        <div class="space-y-4">
                            ${progress.records.length > 0 ? progress.records.slice().reverse().map(record => `
                                <div class="p-4 border rounded-lg bg-gray-50">
                                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <p class="font-bold text-lg text-gray-800">${record.topic}</p>
                                            <p class="text-sm text-gray-500">${new Date(record.date).toLocaleDateString()}</p>
                                        </div>
                                        <div class="flex space-x-4 mt-2 sm:mt-0 text-sm text-center w-full sm:w-auto justify-around">
                                            <div><div class="font-semibold">${record.quizScore}/${record.quizTotal}</div><div class="text-xs text-gray-500">Quiz</div></div>
                                            <div><div class="font-semibold">${formatTime(record.quizTimeTaken)}</div><div class="text-xs text-gray-500">Time</div></div>
                                            <div class="border-l border-gray-200"></div>
                                            <div><div class="font-semibold">${record.problemsScore}/${record.problemsTotal}</div><div class="text-xs text-gray-500">Problems</div></div>
                                            <div><div class="font-semibold">${formatTime(record.problemsTimeTaken)}</div><div class="text-xs text-gray-500">Time</div></div>
                                        </div>
                                    </div>
                                    ${record.mistakes && record.mistakes.length > 0 ? `
                                        <div class="mt-3 pt-3 border-t border-gray-200">
                                            <h4 class="font-semibold text-sm text-gray-600 mb-2">Mistakes to Review:</h4>
                                            <div class="space-y-2 text-sm">
                                                ${record.mistakes.map(mistake => `
                                                    <div class="p-2 bg-red-50 rounded-md">
                                                        <p class="font-semibold text-gray-700">${mistake.questionText}</p>
                                                        <p>Your Answer: <code class="text-red-700 bg-red-100 p-1 rounded text-xs">${mistake.userAnswer}</code></p>
                                                        <p>Correct Answer: <code class="text-green-700 bg-green-100 p-1 rounded text-xs">${mistake.correctAnswer}</code></p>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('') : `
                                <div class="text-center py-8"><p class="text-gray-500">No lessons completed yet.</p></div>
                            `}
                        </div>
                    </div>
                    <div class="text-center mt-8 text-gray-500 text-sm no-print">
                        <p>You can bookmark this page, save it as a PDF (using File > Print), or copy the URL to share it.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        const reportBlob = new Blob([reportHTML], { type: 'text/html' });
        const reportUrl = URL.createObjectURL(reportBlob);
        window.open(reportUrl, '_blank');
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-brand-600 dark:text-brand-400">My Progress Dashboard</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
                </header>
                
                <main className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Winning Streak" value={`${stats.currentStreak} days`} icon="🔥" />
                        <StatCard label="Longest Streak" value={`${stats.longestStreak} days`} icon="🏆" />
                        <StatCard label="Lessons Done" value={stats.lessonsCompleted} icon="📚" />
                        <StatCard label="Average Score" value={`${stats.averageScore}%`} icon="🎯" />
                    </div>

                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Activity</h3>
                    {progress.records.length > 0 ? (
                        <div className="space-y-3">
                            {progress.records.slice().reverse().map((record, index) => (
                               <LessonRecordItem key={index} record={record} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-400">No lessons completed yet. Finish one to start tracking!</p>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                     <button
                        onClick={handleGenerateReport}
                        className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    >
                        Generate Sharable Report
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default Dashboard;