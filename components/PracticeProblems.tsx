import React, { useState, useEffect } from 'react';
import type { PracticeProblems as ProblemsType, Mistake } from '../types';

const PROBLEMS_TIME_SECONDS = 600; // 10 minutes

interface PracticeProblemsProps {
  problemsData: ProblemsType;
  onComplete: (score: number, total: number, timeTaken: number, mistakes: Mistake[]) => void;
}

const PracticeProblems: React.FC<PracticeProblemsProps> = ({ problemsData, onComplete }) => {
  const [userAnswers, setUserAnswers] = useState<string[]>(
    Array(problemsData.problems.length).fill('')
  );
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(PROBLEMS_TIME_SECONDS);

  const score = userAnswers.reduce((acc, userAnswer, index) => {
    const isCorrect = userAnswer.trim().toLowerCase() === problemsData.problems[index].answer.trim().toLowerCase();
    return isCorrect ? acc + 1 : acc;
  }, 0);

  const handleSubmit = React.useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const timeTaken = PROBLEMS_TIME_SECONDS - timeLeft;

    let finalScore = 0;
    const mistakes: Mistake[] = [];
    userAnswers.forEach((answer, index) => {
        const problem = problemsData.problems[index];
        const isCorrect = answer.trim().toLowerCase() === problem.answer.trim().toLowerCase();
        if (isCorrect) {
            finalScore++;
        } else {
            mistakes.push({
                questionText: problem.problemText,
                userAnswer: answer || "No answer",
                correctAnswer: problem.answer
            });
        }
    });
    
    onComplete(finalScore, problemsData.problems.length, timeTaken, mistakes);

  }, [submitted, userAnswers, onComplete, problemsData.problems, timeLeft]);
  
  useEffect(() => {
    if (submitted) return;
    
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, submitted, handleSubmit]);

  const handleAnswerChange = (problemIndex: number, value: string) => {
    if (submitted) return;
    const newAnswers = [...userAnswers];
    newAnswers[problemIndex] = value;
    setUserAnswers(newAnswers);
  };

  const getResultClasses = (problemIndex: number) => {
    if (!submitted) return 'focus:ring-brand-500 focus:border-brand-500';
    
    const userAnswer = userAnswers[problemIndex].trim().toLowerCase();
    const correctAnswer = problemsData.problems[problemIndex].answer.trim().toLowerCase();

    if (userAnswer === correctAnswer) {
      return 'border-green-500 bg-green-50 dark:bg-green-900/50 dark:border-green-600 ring-green-500';
    } else {
      return 'border-red-500 bg-red-50 dark:bg-red-900/50 dark:border-red-600 ring-red-500';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{problemsData.title}</h3>
         {!submitted && (
            <div className="text-lg font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded-md">
                Time Left: {formatTime(timeLeft)}
            </div>
        )}
      </div>
      {problemsData.problems.map((p, pIndex) => (
        <div key={pIndex} className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm space-y-3">
          <p className="font-semibold text-lg text-gray-700 dark:text-gray-200">{pIndex + 1}. {p.problemText}</p>
          <input
            type="text"
            value={userAnswers[pIndex]}
            onChange={(e) => handleAnswerChange(pIndex, e.target.value)}
            disabled={submitted}
            placeholder="Type your answer here"
            className={`w-full p-2 border-2 rounded-md transition-colors ${getResultClasses(pIndex)} dark:bg-gray-700 dark:text-white dark:placeholder-gray-400`}
          />
          {submitted && (
            <div>
              <p className="text-sm font-medium">
                Correct Answer: <span className="text-green-600 dark:text-green-400 font-bold">{p.answer}</span>
              </p>
              {userAnswers[pIndex].trim().toLowerCase() !== p.answer.trim().toLowerCase() && (
                 <p className="mt-2 text-sm">
                    Your answer: <span className="font-mono p-1 bg-red-100 dark:bg-red-800 rounded">{userAnswers[pIndex] || '""'}</span>
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="mt-6 flex justify-between items-center">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
          >
            Check Answers
          </button>
        ) : (
           <div className="text-xl font-bold text-gray-800 dark:text-white">
            Problems Score: {score} / {problemsData.problems.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeProblems;
