import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Eye, FileText, Brain, Send, Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react';
import Redact from "./Redact";
import { BrowserRouter as Router, Routes, Route} from "react-router-dom";

function Home() {
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [objectDetectionEnabled, setObjectDetectionEnabled] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [aiReasoning, setAiReasoning] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I can help you analyze this bodycam footage. Ask me anything about the video, transcript, or detected objects.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [noteTitle, setNoteTitle] = useState('Bodycam Analysis Notes');
  const [noteContent, setNoteContent] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'reasoning'

  useEffect(() => {
    fetch('/labeled_transcript.json')
      .then(response => response.json())
      .then(data => setTranscript(data))
      .catch(error => console.error('Error loading transcript:', error));

    fetch('/ai_reasoning.json')
      .then(response => response.json())
      .then(data => setAiReasoning(data))
      .catch(error => console.error('Error loading AI reasoning:', error));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const videoSource = objectDetectionEnabled 
    ? '/bodycam_detected.mp4'
    : '/bodycam_original.mp4';

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const wasPlaying = !video.paused;
      const currentVideoTime = video.currentTime;
      
      video.src = videoSource;
      video.load();
      video.currentTime = currentVideoTime;
      
      if (wasPlaying) {
        video.play().catch(err => console.error('Playback error:', err));
      }
    }
  }, [videoSource]);

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

  const getCurrentTranscriptEntry = () => {
    return transcript.find(entry => 
      currentTime >= entry.start && currentTime <= entry.end
    );
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;

    const userMessage = { role: 'user', content: inputMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: `Based on the video analysis at ${formatTime(currentTime)}, I can provide insights about your question.`
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const insertFormatting = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = noteContent.substring(start, end) || 'text';
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch(format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'h1':
        formattedText = `# ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'h2':
        formattedText = `## ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'list':
        formattedText = `- ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'numbered':
        formattedText = `1. ${selectedText}`;
        cursorOffset = 3;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newText = noteContent.substring(0, start) + formattedText + noteContent.substring(end);
    setNoteContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectedText.length);
    }, 0);
  };

  const renderMarkdown = (text) => {
    let html = text;
    // Handle bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Handle italic (but not bold)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Handle inline code
    html = html.replace(/`(.+?)`/g, '<code class="bg-gray-800 px-1 rounded text-xs">$1</code>');
    // Handle headings
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-2 mb-1">$1</h2>');
    // Handle bullet lists
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    // Handle numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');
    // Wrap consecutive list items in ul/ol
    html = html.replace(/(<li class="ml-4 list-disc">.*?<\/li>)/gs, '<ul class="ml-2">$1</ul>');
    html = html.replace(/(<li class="ml-4 list-decimal">.*?<\/li>)/gs, '<ol class="ml-2">$1</ol>');
    // Handle line breaks
    html = html.replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="min-h-screen text-white flex" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Left - Note Editor */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="border-b border-gray-800 p-4">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="bg-transparent text-lg font-medium text-gray-200 w-full focus:outline-none"
            placeholder="Document title..."
          />
          <p className="text-xs text-gray-600 mt-1">Add description</p>
        </div>

        <div className="border-b border-gray-800 px-4 py-2 flex gap-1">
          <button
            onClick={() => insertFormatting('bold')}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Bold"
          >
            <Bold className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => insertFormatting('italic')}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Italic"
          >
            <Italic className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => insertFormatting('h1')}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => insertFormatting('h2')}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => insertFormatting('list')}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Bullet List"
          >
            <List className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => insertFormatting('numbered')}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="w-full h-full bg-transparent text-gray-300 p-6 focus:outline-none resize-none text-sm leading-relaxed"
            placeholder="Start typing your analysis..."
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
          />
        </div>
      </div>

      {/* Right - Video & AI Assistant */}
      <div className="w-[600px] border-l border-gray-800 flex flex-col" style={{ backgroundColor: '#0f0f0f', height: '100vh' }}>
        {/* Video Player */}
        <div className="p-4">
          <div className="bg-black rounded overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center relative">
              <video
                ref={videoRef}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              >
                <source src={videoSource} type="video/mp4" />
              </video>
              
              {(objectDetectionEnabled || ocrEnabled) && (
                <div className="absolute top-2 right-2 flex gap-1.5">
                  {objectDetectionEnabled && (
                    <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-xs text-gray-400">
                      Objects
                    </div>
                  )}
                  {ocrEnabled && (
                    <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-xs text-gray-400">
                      OCR
                    </div>
                  )}
                </div>
              )}

              {getCurrentTranscriptEntry() && (
                <div className="absolute bottom-3 left-3 right-3 bg-black bg-opacity-80 px-3 py-2 rounded">
                  <p className="text-sm text-white">{getCurrentTranscriptEntry().text}</p>
                </div>
              )}
            </div>

            <div className="bg-black p-3 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="w-8 h-8 hover:bg-gray-800 rounded flex items-center justify-center transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                
                <div 
                  className="flex-1 h-1 bg-gray-800 rounded-full cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-gray-500"
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
        </div>

        {/* Controls */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setObjectDetectionEnabled(!objectDetectionEnabled)}
            className={`flex-1 px-3 py-2 rounded text-xs transition ${
              objectDetectionEnabled ? 'bg-gray-800 text-gray-200' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1.5" />
            Object Detection
          </button>
          
          <button
            onClick={() => setOcrEnabled(!ocrEnabled)}
            className={`flex-1 px-3 py-2 rounded text-xs transition ${
              ocrEnabled ? 'bg-gray-800 text-gray-200' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            OCR
          </button>

          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex-1 px-3 py-2 rounded text-xs transition ${
              showTranscript ? 'bg-gray-800 text-gray-200' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Transcript
          </button>
        </div>

        {/* Transcript Panel */}
        {showTranscript && (
          <div className="px-4 pb-3" style={{ height: '200px', overflow: 'auto' }}>
            <div className="text-xs space-y-1.5">
              {transcript.length > 0 ? (
                transcript.map((entry, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded cursor-pointer transition ${
                      currentTime >= entry.start && currentTime <= entry.end
                        ? 'bg-gray-800'
                        : 'hover:bg-gray-900'
                    }`}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = entry.start;
                      }
                    }}
                  >
                    <span className="text-gray-500">{formatTime(entry.start)}</span>
                    <p className="mt-0.5 text-gray-300">{entry.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Loading...</p>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-t border-b border-gray-800 flex" style={{ flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-3 text-sm transition ${
              activeTab === 'chat' 
                ? 'text-gray-200 border-b-2 border-gray-500' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('reasoning')}
            className={`flex-1 px-4 py-3 text-sm transition ${
              activeTab === 'reasoning' 
                ? 'text-gray-200 border-b-2 border-gray-500' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            AI Reasoning
          </button>
        </div>

        {/* Chat/Reasoning Content - ALWAYS SAME SIZE */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <div className="p-4 h-full">
            {activeTab === 'chat' ? (
              <div className="space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded p-3 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-gray-800 text-gray-200' 
                          : 'bg-gray-900 text-gray-400'
                      }`}
                    >
                      {renderMarkdown(msg.content)}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="text-xs text-gray-500">Typing...</div>
                )}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <div className="text-sm space-y-3">
                {aiReasoning ? (
                  <>
                    <div className="p-3 rounded bg-gray-900">
                      <h4 className="font-medium text-gray-400 mb-2 text-xs">Scene Analysis</h4>
                      <p className="text-gray-300">{aiReasoning.sceneAnalysis}</p>
                    </div>
                    <div className="p-3 rounded bg-gray-900">
                      <h4 className="font-medium text-gray-400 mb-2 text-xs">Key Events</h4>
                      <p className="text-gray-300">{aiReasoning.keyEvents}</p>
                    </div>
                    <div className="p-3 rounded bg-gray-900">
                      <h4 className="font-medium text-gray-400 mb-2 text-xs">Context</h4>
                      <p className="text-gray-300">{aiReasoning.context}</p>
                    </div>
                    {aiReasoning.transcriptSummary && aiReasoning.transcriptSummary.keyPhrases && (
                      <div className="p-3 rounded bg-gray-900">
                        <h4 className="font-medium text-gray-400 mb-2 text-xs">Key Moments</h4>
                        <div className="space-y-2">
                          {aiReasoning.transcriptSummary.keyPhrases.map((phrase, idx) => (
                            <div key={idx}>
                              <span className="text-gray-500 text-xs">{formatTime(phrase.time)}</span>
                              <p className="text-gray-300 mt-0.5">{phrase.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">Loading AI reasoning...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Input - FIXED HEIGHT */}
        <div className="p-4 border-t border-gray-800" style={{ flexShrink: 0 }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-gray-900 text-gray-300 text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-700"
              placeholder="Ask about the video..."
              disabled={activeTab !== 'chat'}
            />
            <button
              onClick={handleSendMessage}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded px-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={activeTab !== 'chat'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/redact" element={<Redact />} />
      </Routes>
    </Router>
  );
  
}