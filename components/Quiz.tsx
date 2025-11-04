import React, { useState, useEffect } from 'react';
import type { Quiz as QuizType, Mistake } from '../types';

const QUIZ_TIME_SECONDS = 300; // 5 minutes

interface QuizProps {
  quizData: QuizType;
  onComplete: (score: number, total: number, timeTaken: number, mistakes: Mistake[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ quizData, onComplete }) => {
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(
    Array(quizData.questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(QUIZ_TIME_SECONDS); 

  const score = userAnswers.reduce((acc, answer, index) => {
    return answer === quizData.questions[index].correctAnswerIndex ? acc + 1 : acc;
  }, 0);

  const handleSubmit = React.useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const timeTaken = QUIZ_TIME_SECONDS - timeLeft;
    
    let finalScore = 0;
    const mistakes: Mistake[] = [];
    userAnswers.forEach((answer, index) => {
        const question = quizData.questions[index];
        const isCorrect = answer === question.correctAnswerIndex;
        if (isCorrect) {
            finalScore++;
        } else {
            mistakes.push({
                questionText: question.questionText,
                userAnswer: answer !== null ? question.options[answer] : "No answer",
                correctAnswer: question.options[question.correctAnswerIndex],
            });
        }
    });

    onComplete(finalScore, quizData.questions.length, timeTaken, mistakes);

  }, [submitted, userAnswers, onComplete, quizData.questions, timeLeft]);

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

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const getResultClasses = (questionIndex: number, optionIndex: number) => {
    if (!submitted) return 'border-gray-300 dark:border-gray-600';
    const question = quizData.questions[questionIndex];
    const isCorrect = question.correctAnswerIndex === optionIndex;
    const isSelected = userAnswers[questionIndex] === optionIndex;

    if (isCorrect) {
      return 'border-green-500 bg-green-100 dark:bg-green-900/50 dark:border-green-600';
    }
    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-100 dark:bg-red-900/50 dark:border-red-600';
    }
    return 'border-gray-300 dark:border-gray-600';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{quizData.title}</h3>
        {!submitted && (
            <div className="text-lg font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded-md">
                Time Left: {formatTime(timeLeft)}
            </div>
        )}
      </div>
      {quizData.questions.map((q, qIndex) => (
        <div key={qIndex} className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          <p className="font-semibold text-lg mb-4 text-gray-700 dark:text-gray-200">{qIndex + 1}. {q.questionText}</p>
          <div className="space-y-3">
            {q.options.map((option, oIndex) => (
              <label
                key={oIndex}
                className={`flex items-center p-3 border-2 rounded-md cursor-pointer transition-colors ${getResultClasses(qIndex, oIndex)}`}
              >
                <input
                  type="radio"
                  name={`question-${qIndex}`}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                  checked={userAnswers[qIndex] === oIndex}
                  onChange={() => handleAnswerChange(qIndex, oIndex)}
                  disabled={submitted}
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
           {submitted && userAnswers[qIndex] !== q.correctAnswerIndex && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 rounded-r-md text-sm">
                <p>Your answer: <span className="font-semibold text-red-700 dark:text-red-300">{userAnswers[qIndex] !== null ? q.options[userAnswers[qIndex]!] : 'N/A'}</span></p>
                <p>Correct answer: <span className="font-semibold text-green-700 dark:text-green-300">{q.options[q.correctAnswerIndex]}</span></p>
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
            Quiz Score: {score} / {quizData.questions.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
