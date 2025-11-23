import React from 'react';
import { Problem } from '../types';

interface ProblemDescriptionProps {
  problem: Problem;
}

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem }) => {
  const difficultyColor = 
    problem.difficulty === 'Easy' ? 'text-green-400 bg-green-400/10' :
    problem.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10' :
    'text-red-400 bg-red-400/10';

  return (
    <div className="h-full overflow-y-auto p-6 text-slate-300 space-y-6 custom-scrollbar">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
        <div className="flex items-center space-x-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColor}`}>
            {problem.difficulty}
          </span>
          <div className="flex space-x-2">
            {problem.tags.map((tag, idx) => (
              <span key={idx} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="prose prose-invert prose-sm max-w-none">
        <p className="whitespace-pre-wrap leading-7">{problem.description}</p>
      </div>

      {/* Examples */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Examples</h3>
        {problem.examples.map((example, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-slate-500">Input:</span> <span className="text-blue-300">{example.input}</span>
              </div>
              <div>
                <span className="text-slate-500">Output:</span> <span className="text-green-300">{example.output}</span>
              </div>
              {example.explanation && (
                <div className="text-slate-400 italic mt-1 text-xs font-sans">
                  Explanation: {example.explanation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Constraints - Mocked for now as Gemini might not always provide them strictly in schema */}
      <div className="space-y-2 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Constraints</h3>
        <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
          <li>Execution time limit: 2000ms</li>
          <li>Memory limit: 256MB</li>
        </ul>
      </div>
    </div>
  );
};

export default ProblemDescription;