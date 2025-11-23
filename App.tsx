import React, { useState, useEffect, useRef } from 'react';
import { generateProblem, evaluateCode } from './services/geminiService';
import ChatInterface from './components/ChatInterface';
import ProblemDescription from './components/ProblemDescription';
import CodeEditor from './components/CodeEditor';
import VideoCallInterface from './components/VideoCallInterface';
import { Message, Problem, Sender, ExecutionResult, P2PData } from './types';

// Declare PeerJS globally since it's loaded via script tag
declare const Peer: any;

const INITIAL_PROBLEM: Problem = {
  id: 'waiting',
  title: 'Waiting for Problem',
  description: 'The interviewer has not selected a problem yet.',
  difficulty: 'Medium',
  tags: [],
  examples: [],
  starterCode: '// Wait for interviewer...'
};

const App: React.FC = () => {
  // App Flow State
  const [appState, setAppState] = useState<'lobby' | 'interview'>('lobby');
  const [role, setRole] = useState<'interviewer' | 'candidate' | null>(null);
  const [joinIdInput, setJoinIdInput] = useState('');
  
  // P2P State
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  
  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Workspace State
  const [problem, setProblem] = useState<Problem>(INITIAL_PROBLEM);
  const [code, setCode] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  
  // UI State
  const [viewMode, setViewMode] = useState<'chat' | 'video'>('chat');

  // Refs for P2P
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const callRef = useRef<any>(null);

  // Initialize Peer on mount
  useEffect(() => {
    const peer = new Peer();
    
    peer.on('open', (id: string) => {
      setPeerId(id);
    });

    peer.on('connection', (conn: any) => {
      handleConnection(conn);
    });

    peer.on('call', (call: any) => {
      // Answer incoming call with local stream if available
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setLocalStream(stream);
        call.answer(stream);
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
        });
        callRef.current = call;
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, []);

  const handleConnection = (conn: any) => {
    connRef.current = conn;
    setConnectionStatus('connected');
    setRemotePeerId(conn.peer);
    
    // Setup data listeners
    conn.on('data', (data: P2PData) => {
      handleIncomingData(data);
    });

    conn.on('close', () => {
      setConnectionStatus('idle');
      setRemotePeerId('');
      alert('Peer disconnected');
    });
  };

  const startInterview = () => {
    setRole('interviewer');
    setAppState('interview');
    // Initialize Local Stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setLocalStream(stream);
    });
  };

  const joinInterview = () => {
    if (!joinIdInput) return;
    setRole('candidate');
    setConnectionStatus('connecting');
    
    const conn = peerRef.current.connect(joinIdInput);
    
    conn.on('open', () => {
      handleConnection(conn);
      setAppState('interview');
      
      // Initiate Call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        setLocalStream(stream);
        const call = peerRef.current.call(joinIdInput, stream);
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
        });
        callRef.current = call;
      });
    });

    conn.on('error', (err: any) => {
      console.error(err);
      setConnectionStatus('error');
    });
  };

  // ----------------------------------------------------------------
  // Data Sync Logic
  // ----------------------------------------------------------------

  const sendData = (type: P2PData['type'], payload: any) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ type, payload });
    }
  };

  const handleIncomingData = (data: P2PData) => {
    switch (data.type) {
      case 'CODE':
        setCode(data.payload);
        break;
      case 'PROBLEM':
        setProblem(data.payload);
        if (role === 'candidate') {
           setCode(data.payload.starterCode);
        }
        break;
      case 'CHAT':
        setMessages(prev => [...prev, { ...data.payload, sender: Sender.REMOTE }]);
        break;
      case 'RESULT':
        setExecutionResult(data.payload);
        break;
    }
  };

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  const handleSendMessage = (text: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, msg]);
    sendData('CHAT', msg);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    sendData('CODE', newCode);
  };

  const handleGenerateProblem = async () => {
    const newProblem = await generateProblem('Medium');
    setProblem(newProblem);
    setCode(newProblem.starterCode);
    sendData('PROBLEM', newProblem);
    sendData('CODE', newProblem.starterCode);
  };

  const handleRunCode = async () => {
    setExecuting(true);
    // Execute locally (via Gemini API)
    const result = await evaluateCode(problem, code);
    setExecutionResult(result);
    setExecuting(false);
    // Sync result to peer
    sendData('RESULT', result);
  };

  // ----------------------------------------------------------------
  // Renders
  // ----------------------------------------------------------------

  if (appState === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Tech Interviewer</h1>
            <p className="text-slate-400">Peer-to-Peer Interview Platform</p>
          </div>

          {/* Start as Interviewer */}
          <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">I am the Interviewer</h3>
            <p className="text-xs text-slate-400 mb-4">Start a new session and share your ID.</p>
            <button 
              onClick={startInterview}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Create Interview Session</span>
            </button>
            {peerId && (
               <div className="mt-4 pt-4 border-t border-slate-700">
                 <p className="text-xs text-slate-500 mb-1">Your Session ID:</p>
                 <div className="flex items-center space-x-2">
                   <code className="flex-1 bg-black/30 p-2 rounded text-sm font-mono text-green-400 select-all">{peerId}</code>
                   <button 
                    onClick={() => navigator.clipboard.writeText(peerId)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                       <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                     </svg>
                   </button>
                 </div>
               </div>
            )}
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-600 text-xs uppercase">Or</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          {/* Join as Candidate */}
          <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">I am the Candidate</h3>
            <div className="space-y-3">
               <input 
                 type="text" 
                 placeholder="Enter Interviewer ID"
                 value={joinIdInput}
                 onChange={(e) => setJoinIdInput(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
               />
               <button 
                  onClick={joinInterview}
                  disabled={!joinIdInput}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  Join Session
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interview Workspace
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden selection:bg-blue-500/30">
      
      {/* Hidden Audio Element for persistent remote audio even when switching tabs */}
      {remoteStream && (
         <audio ref={ref => { if(ref) ref.srcObject = remoteStream }} autoPlay />
      )}

      {/* Left: Communication Interface (Chat or Video) */}
      <div className="hidden md:flex h-full md:w-1/3 lg:w-[400px] border-r border-slate-800 flex-col">
         {/* Toggle Header for Chat/Video */}
         <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-center p-2">
            <div className="flex bg-slate-800 rounded-lg p-1 w-full max-w-xs border border-slate-700">
                <button 
                    onClick={() => setViewMode('chat')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'chat' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    <span>Chat</span>
                </button>
                <button 
                    onClick={() => setViewMode('video')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'video' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    <span>Video Call</span>
                </button>
            </div>
         </div>

         {/* Connection Status Banner */}
         {connectionStatus !== 'connected' && (
           <div className="bg-yellow-900/50 text-yellow-200 text-xs px-4 py-2 text-center border-b border-yellow-900/50">
             {connectionStatus === 'connecting' ? 'Connecting to peer...' : 'Waiting for connection...'}
             {role === 'interviewer' && <span className="block text-[10px] mt-1 opacity-70">Share ID: {peerId}</span>}
           </div>
         )}

         {/* Content Area */}
         <div className="flex-1 overflow-hidden relative">
            {viewMode === 'chat' && (
                <ChatInterface 
                    messages={messages} 
                    onSendMessage={handleSendMessage}
                    isTyping={false} // Simplification
                />
            )}
            
            {/* 
              Always render VideoCallInterface but hide it when in chat mode. 
              This keeps the video elements mounted for WebRTC stability. 
            */}
            <div className={`absolute inset-0 ${viewMode === 'video' ? 'block' : 'hidden'}`}>
                <VideoCallInterface 
                    localStream={localStream}
                    remoteStream={remoteStream}
                    remoteConnected={connectionStatus === 'connected'}
                    onEndCall={() => setViewMode('chat')}
                />
            </div>
         </div>
      </div>
      
      {/* Right: Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#0f172a]">
        
        {/* Top Navigation / Tabs */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center space-x-2 overflow-hidden">
             {role === 'interviewer' && (
                <button 
                  onClick={handleGenerateProblem}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700 transition-colors"
                >
                  Generate New Problem
                </button>
             )}
            <div className="flex items-center space-x-1 text-slate-300 font-medium text-sm">
              <span className="text-blue-500 px-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="truncate max-w-[150px] md:max-w-md">{problem.title}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
             <div className="hidden lg:flex items-center space-x-2 mr-4">
               <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your Role:</span>
               <span className={`text-xs px-2 py-0.5 rounded border ${role === 'interviewer' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : 'bg-green-900/30 text-green-400 border-green-900/50'}`}>
                 {role === 'interviewer' ? 'Interviewer' : 'Candidate'}
               </span>
             </div>

            <button
              onClick={handleRunCode}
              disabled={executing}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                executing 
                  ? 'bg-slate-700 text-slate-400 cursor-wait' 
                  : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
              }`}
            >
              {executing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>Run Tests</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Workspace Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Problem Description Pane */}
          <div className="flex-1 md:flex-1/2 lg:flex-[0.4] border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900 overflow-y-auto">
             <ProblemDescription problem={problem} />
          </div>

          {/* Editor Pane */}
          <div className="flex-1 md:flex-1/2 lg:flex-[0.6] flex flex-col bg-[#1e1e1e]">
            <div className="flex-1 relative overflow-hidden">
              <CodeEditor code={code} onChange={handleCodeChange} />
            </div>
            
            {/* Console / Output Pane */}
            <div className="h-1/3 border-t border-[#333] bg-[#1e1e1e] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Evaluation Console</span>
                {executionResult && (
                  <span className={`text-xs px-2 py-0.5 rounded ${executionResult.passed ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {executionResult.passed ? 'Passed' : 'Failed'}
                  </span>
                )}
              </div>
              <div className="flex-1 p-4 font-mono text-sm overflow-y-auto text-slate-300">
                {!executionResult && !executing && (
                  <div className="text-slate-600 italic">Click "Run Tests" to verify code...</div>
                )}
                {executing && (
                  <div className="text-slate-500 animate-pulse">Running test suite...</div>
                )}
                {executionResult && (
                  <div className="space-y-2">
                     {executionResult.error ? (
                        <div className="text-red-400 bg-red-900/10 p-2 rounded border border-red-900/20">
                           <strong>Runtime Error:</strong>
                           <pre className="whitespace-pre-wrap mt-1 text-xs">{executionResult.error}</pre>
                        </div>
                     ) : (
                        <>
                           <div className="grid grid-cols-2 gap-4 mb-4">
                             <div className="bg-[#2d2d2d] p-2 rounded">
                               <div className="text-xs text-slate-500 mb-1">Status</div>
                               <div className={executionResult.passed ? "text-green-400" : "text-red-400"}>
                                 {executionResult.passed ? "Accepted" : "Wrong Answer"}
                               </div>
                             </div>
                             <div className="bg-[#2d2d2d] p-2 rounded">
                               <div className="text-xs text-slate-500 mb-1">Test Cases</div>
                               <div>{executionResult.testCasesPassed} / {executionResult.totalTestCases} Passed</div>
                             </div>
                           </div>
                           
                           <div className="text-slate-300">
                             <div className="text-xs text-slate-500 mb-1">Output Log:</div>
                             <pre className="whitespace-pre-wrap text-xs text-slate-400 font-mono">{executionResult.output}</pre>
                           </div>

                           {executionResult.feedback && (
                             <div className="mt-3 text-blue-400 text-xs border-l-2 border-blue-500 pl-2">
                               System Analysis: {executionResult.feedback}
                             </div>
                           )}
                        </>
                     )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Chat Overlay */}
      <div className="md:hidden fixed inset-0 bg-slate-900 z-50 transform transition-transform duration-300 translate-x-full">
        {/* Placeholder for mobile chat view */}
      </div>
    </div>
  );
};

export default App;
