import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Eye, FileText, Brain } from 'lucide-react';

export default function App() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [objectDetectionEnabled, setObjectDetectionEnabled] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showPerplexity, setShowPerplexity] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [aiReasoning, setAiReasoning] = useState(null);

  // Load transcript from JSON file
  useEffect(() => {
    fetch('/labeled_transcript.json')
      .then(response => response.json())
      .then(data => setTranscript(data))
      .catch(error => console.error('Error loading transcript:', error));

    // Load AI reasoning
    fetch('/ai_reasoning.json')
      .then(response => response.json())
      .then(data => setAiReasoning(data))
      .catch(error => console.error('Error loading AI reasoning:', error));
  }, []);

  // Switch between videos when object detection is toggled
  const videoSource = objectDetectionEnabled 
    ? '/bodycam_detected.mp4'  // Video with object detection overlays
    : '/bodycam_original.mp4'; // Original video

  // Handle video switching
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const wasPlaying = !video.paused;
      const currentVideoTime = video.currentTime;
      
      video.src = videoSource;
      video.load(); // Explicitly load the new source
      video.currentTime = currentVideoTime;
      
      if (wasPlaying) {
        video.play().catch(err => console.error('Playback error:', err));
      }
    }
  }, [videoSource]);

  // Video event handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoError = () => {
    if (videoRef.current) {
      console.error('Video error code:', videoRef.current.error?.code);
      console.error('Video error message:', videoRef.current.error?.message);
      console.error('Current video src:', videoRef.current.src);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e) => {
    const progressBar = e.currentTarget;
    const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
    const newTime = clickPosition * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Get current transcript entry
  const getCurrentTranscriptEntry = () => {
    return transcript.find(entry => 
      currentTime >= entry.start && currentTime <= entry.end
    );
  };

  return (
    <div className="min-h-screen text-white p-4" style={{ backgroundColor: '#0f0e1a' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-medium text-gray-300">Bodycam Analysis</h1>
        </div>

        <div className="flex gap-4">
          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${showTranscript || showPerplexity ? 'max-w-3xl' : ''}`}>
            {/* Video Player */}
            <div className="bg-black rounded overflow-hidden mb-3">
              <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onError={handleVideoError}
                >
                  <source src={videoSource} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Detection Overlays Indicator */}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  {objectDetectionEnabled && (
                    <div className="bg-gray-800 bg-opacity-80 px-2 py-1 rounded text-xs text-gray-300">
                      Objects
                    </div>
                  )}
                  {ocrEnabled && (
                    <div className="bg-gray-800 bg-opacity-80 px-2 py-1 rounded text-xs text-gray-300">
                      OCR
                    </div>
                  )}
                </div>

                {/* Current transcript overlay */}
                {getCurrentTranscriptEntry() && (
                  <div className="absolute bottom-16 left-4 right-4 bg-black bg-opacity-75 px-4 py-2 rounded">
                    <p className="text-sm text-white">{getCurrentTranscriptEntry().text}</p>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              <div className="bg-[#0a0a0f] p-3 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayPause}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  
                  <div 
                    className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div 
                      className="h-full bg-gray-600 transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                  </div>
                  
                  <span className="text-xs text-gray-500 min-w-20">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  
                  <button
                    onClick={handleMuteToggle}
                    className="w-8 h-8 hover:bg-gray-800 rounded flex items-center justify-center transition"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  
                  <button 
                    onClick={handleFullscreen}
                    className="w-8 h-8 hover:bg-gray-800 rounded flex items-center justify-center transition"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Analysis Control Card */}
            <div className="rounded p-4" style={{ backgroundColor: '#1a1929' }}>
              <div className="space-y-2.5">
                {/* Object Detection Toggle */}
                <div className="flex items-center justify-between p-3 rounded hover:bg-opacity-80 transition" style={{ backgroundColor: '#0f0e1a' }}>
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Object Detection</span>
                  </div>
                  <button
                    onClick={() => setObjectDetectionEnabled(!objectDetectionEnabled)}
                    className={`relative w-11 h-6 rounded-full transition ${
                      objectDetectionEnabled ? 'bg-gray-600' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-gray-300 rounded-full transition transform ${
                        objectDetectionEnabled ? 'translate-x-5' : ''
                      }`}
                    ></div>
                  </button>
                </div>

                {/* OCR Toggle */}
                <div className="flex items-center justify-between p-3 rounded hover:bg-opacity-80 transition" style={{ backgroundColor: '#0f0e1a' }}>
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">OCR Overlay</span>
                  </div>
                  <button
                    onClick={() => setOcrEnabled(!ocrEnabled)}
                    className={`relative w-11 h-6 rounded-full transition ${
                      ocrEnabled ? 'bg-gray-600' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-gray-300 rounded-full transition transform ${
                        ocrEnabled ? 'translate-x-5' : ''
                      }`}
                    ></div>
                  </button>
                </div>

                {/* Detected Objects Summary */}
                {objectDetectionEnabled && (
                  <div className="p-3 rounded border border-gray-700" style={{ backgroundColor: '#0f0e1a' }}>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">Person (2)</span>
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">Vehicle (1)</span>
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">Phone (1)</span>
                    </div>
                  </div>
                )}

                {/* OCR Text Summary */}
                {ocrEnabled && (
                  <div className="p-3 rounded border border-gray-700" style={{ backgroundColor: '#0f0e1a' }}>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">ABC-1234</span>
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">Main St</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panels */}
          <div className="space-y-2.5">
            {/* Transcript Button & Panel */}
            <div>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`w-full px-4 py-2.5 rounded font-medium transition flex items-center justify-center gap-2 text-sm ${
                  showTranscript
                    ? 'text-gray-300'
                    : 'text-gray-400 hover:bg-opacity-80'
                }`}
                style={{ backgroundColor: '#1a1929' }}
              >
                <FileText className="w-4 h-4" />
                Transcript
              </button>
              
              {showTranscript && (
                <div className="mt-2.5 w-80 rounded p-4 max-h-96 overflow-y-auto" style={{ backgroundColor: '#1a1929' }}>
                  <div className="space-y-2 text-sm">
                    {transcript.length > 0 ? (
                      transcript.map((entry, index) => (
                        <div 
                          key={index}
                          className={`p-2.5 rounded cursor-pointer transition ${
                            currentTime >= entry.start && currentTime <= entry.end
                              ? 'bg-gray-600'
                              : ''
                          }`}
                          style={{ backgroundColor: currentTime >= entry.start && currentTime <= entry.end ? '#2a2942' : '#0f0e1a' }}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = entry.start;
                            }
                          }}
                        >
                          <span className="text-gray-500 text-xs">{formatTime(entry.start)}</span>
                          <p className="mt-1 text-gray-300">{entry.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center">Loading transcript...</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Reasoning Button & Panel */}
            <div>
              <button
                onClick={() => setShowPerplexity(!showPerplexity)}
                className={`w-full px-4 py-2.5 rounded font-medium transition flex items-center justify-center gap-2 text-sm ${
                  showPerplexity
                    ? 'text-gray-300'
                    : 'text-gray-400 hover:bg-opacity-80'
                }`}
                style={{ backgroundColor: '#1a1929' }}
              >
                <Brain className="w-4 h-4" />
                AI Reasoning
              </button>
              
              {showPerplexity && (
                <div className="mt-2.5 w-80 rounded p-4 max-h-96 overflow-y-auto" style={{ backgroundColor: '#1a1929' }}>
                  <div className="space-y-2.5 text-sm">
                    {aiReasoning ? (
                      <>
                        <div className="p-2.5 rounded" style={{ backgroundColor: '#0f0e1a' }}>
                          <h4 className="font-medium text-gray-400 mb-1.5 text-xs">Scene Analysis</h4>
                          <p className="text-gray-300 text-xs">{aiReasoning.sceneAnalysis}</p>
                        </div>
                        <div className="p-2.5 rounded" style={{ backgroundColor: '#0f0e1a' }}>
                          <h4 className="font-medium text-gray-400 mb-1.5 text-xs">Key Events</h4>
                          <p className="text-gray-300 text-xs">{aiReasoning.keyEvents}</p>
                        </div>
                        <div className="p-2.5 rounded" style={{ backgroundColor: '#0f0e1a' }}>
                          <h4 className="font-medium text-gray-400 mb-1.5 text-xs">Context</h4>
                          <p className="text-gray-300 text-xs">{aiReasoning.context}</p>
                        </div>
                        {aiReasoning.transcriptSummary && aiReasoning.transcriptSummary.keyPhrases.length > 0 && (
                          <div className="p-2.5 rounded border border-gray-700" style={{ backgroundColor: '#0f0e1a' }}>
                            <h4 className="font-medium text-gray-400 mb-1.5 text-xs">Key Moments</h4>
                            <div className="space-y-1">
                              {aiReasoning.transcriptSummary.keyPhrases.map((phrase, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-gray-500">{formatTime(phrase.time)}</span>
                                  <p className="text-gray-300 mt-0.5">{phrase.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 text-center">Loading AI reasoning...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}