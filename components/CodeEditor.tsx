import React from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (val: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  // Handle Tab key to insert spaces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const newValue = code.substring(0, start) + "  " + code.substring(end);
      onChange(newValue);
      
      // Restore selection
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="h-full w-full bg-[#1e1e1e] relative group">
      {/* Line Numbers Simulation (basic) */}
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] border-r border-[#333] text-slate-600 font-mono text-xs text-right py-4 pr-2 select-none pointer-events-none overflow-hidden">
        {code.split('\n').map((_, i) => (
          <div key={i} className="leading-6">{i + 1}</div>
        ))}
      </div>
      
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="w-full h-full bg-transparent text-[#d4d4d4] font-mono text-sm p-4 pl-12 resize-none focus:outline-none leading-6"
        style={{
          whiteSpace: 'pre',
          tabSize: 2,
        }}
      />
      
      <div className="absolute bottom-2 right-4 text-xs text-slate-600 pointer-events-none group-hover:text-slate-500 transition-colors">
        JavaScript
      </div>
    </div>
  );
};

export default CodeEditor;