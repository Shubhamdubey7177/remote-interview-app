import React, { useEffect, useRef, useState } from 'react';

interface VideoCallInterfaceProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteConnected: boolean;
  onEndCall: () => void; // Used to switch view back to chat
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ 
  localStream, 
  remoteStream, 
  remoteConnected,
  onEndCall 
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !camOn);
      setCamOn(!camOn);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white relative overflow-hidden">
      {/* Remote Video (Main View) */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {remoteConnected && remoteStream ? (
           <video 
             ref={remoteVideoRef} 
             autoPlay 
             playsInline 
             className="w-full h-full object-cover"
           />
        ) : (
           <div className="flex flex-col items-center justify-center text-slate-500 space-y-4">
             <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
             </div>
             <p className="text-sm font-medium">Waiting for other person to join...</p>
           </div>
        )}

        {/* Local Video (PIP) */}
        {localStream && (
          <div className="absolute bottom-4 right-4 w-32 md:w-48 aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-2xl ring-1 ring-white/10 z-10">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted // Mute local echo
              className="w-full h-full object-cover transform scale-x-[-1]" 
            />
            <div className="absolute bottom-1 left-2 text-[10px] font-medium text-white/70 bg-black/30 px-1.5 rounded">
              You
            </div>
            {!micOn && (
               <div className="absolute top-2 right-2 text-red-500 bg-black/50 rounded-full p-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12.732a1 1 0 01-1.707.707l-3.536-3.536H3.328a1 1 0 01-.992-.883l-.5-7A1 1 0 012.828 5h2.164l3.536-3.536a1 1 0 01.855-.388zM13.38 6.64a1 1 0 01.956 1.258 5.003 5.003 0 000 4.204 1 1 0 01-1.912.59 7.003 7.003 0 010-5.462 1 1 0 01.956-.59z" clipRule="evenodd" />
                 </svg>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-6 z-20">
        <button 
          onClick={toggleMic}
          className={`p-3 rounded-full transition-colors ${micOn ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
        >
          {micOn ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
             </svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12.732a1 1 0 01-1.707.707l-3.536-3.536H3.328a1 1 0 01-.992-.883l-.5-7A1 1 0 012.828 5h2.164l3.536-3.536a1 1 0 01.855-.388z" clipRule="evenodd" />
                <path d="M12.7 7.3a1 1 0 011.4 0l.9.9a1 1 0 11-1.4 1.4l-.9-.9a1 1 0 010-1.4zM15 11.7a1 1 0 011.4 0l.9.9a1 1 0 01-1.4 1.4l-.9-.9a1 1 0 010-1.4z" />
             </svg>
          )}
        </button>
        
        <button 
            onClick={onEndCall}
            className="px-6 py-2 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 hover:text-white font-medium text-sm transition-all"
        >
            Show Chat
        </button>

         <button 
          onClick={toggleCam}
          className={`p-3 rounded-full transition-colors ${camOn ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
        >
           {camOn ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
           ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1l-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
               <path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
           )}
        </button>
      </div>
    </div>
  );
};

export default VideoCallInterface;
