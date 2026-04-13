'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Terminal, Wifi, WifiOff, XCircle, RefreshCw } from 'lucide-react';

export default function ConsolePage() {
  const params = useParams();
  const router = useRouter();
  const vmid = params.vmid as string;

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication required. Please log in again.');
      setStatus('error');
      return;
    }

    let isMounted = true;

    const connect = () => {
      // Connect to the VNC proxy but treat it as raw data stream
      const wsUrl = `ws://localhost:3001/vnc-proxy?vmid=${vmid}&token=${encodeURIComponent(token)}`;
      console.log('[Console] Connecting to proxy:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Console] WebSocket connected');
        if (isMounted) {
          setStatus('connected');
          setOutput(prev => [...prev, '\x1b[32m=== VM Console Connected ===\x1b[0m']);
        }
      };

      ws.onmessage = (event) => {
        let text: string;
        
        // Handle different data types
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8');
          text = decoder.decode(event.data);
        } else if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result && isMounted) {
              processConsoleOutput(reader.result as string);
            }
          };
          reader.readAsText(event.data);
          return;
        } else {
          text = String(event.data);
        }
        
        if (text) {
          processConsoleOutput(text);
        }
      };

      const processConsoleOutput = (rawText: string) => {
        // Extract only readable text from the data stream
        let cleanText = rawText;
        
        // Remove RFB protocol headers and version info
        cleanText = cleanText.replace(/RFB\s+\d+\.\d+/g, '');
        cleanText = cleanText.replace(/\[RFB\]/gi, '');
        
        // Keep only readable ASCII characters, newlines, tabs, and carriage returns
        cleanText = cleanText.replace(/[^\x20-\x7E\n\r\t]/g, '');
        
        // Remove excessive whitespace
        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        
        if (!cleanText) return;
        
        setOutput(prev => {
          const lastLine = prev[prev.length - 1] || '';
          const newOutput = [...prev];
          
          // Split into lines
          const lines = cleanText.split(/\r?\n/);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
              newOutput.push(line);
            }
          }
          
          // Keep last 1000 lines
          while (newOutput.length > 1000) newOutput.shift();
          return newOutput;
        });
        
        // Auto-scroll
        setTimeout(() => {
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }
        }, 50);
      };

      ws.onerror = (error) => {
        console.error('[Console] WebSocket error:', error);
        if (isMounted) {
          setError('Connection error');
          setStatus('error');
        }
      };

      ws.onclose = () => {
        console.log('[Console] WebSocket closed');
        if (isMounted && status === 'connected') {
          setStatus('disconnected');
          setOutput(prev => [...prev, '\x1b[31m=== Connection Closed ===\x1b[0m']);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [vmid]);

  const sendCommand = () => {
    if (inputRef.current && wsRef.current && status === 'connected') {
      const command = inputRef.current.value;
      if (command.trim()) {
        wsRef.current.send(command + '\n');
        setOutput(prev => [...prev, `\x1b[33m$ ${command}\x1b[0m`]);
        inputRef.current.value = '';
        
        setTimeout(() => {
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }
        }, 50);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendCommand();
    }
  };

  const handleBack = () => router.back();
  const handleRetry = () => {
    setStatus('connecting');
    setError(null);
    setOutput([]);
    window.location.reload();
  };

  const clearScreen = () => {
    setOutput([]);
  };

  // Simple ANSI color conversion
  const renderLine = (line: string, index: number) => {
    let html = line
      .replace(/\x1b\[32m/g, '<span class="text-green-400">')
      .replace(/\x1b\[31m/g, '<span class="text-red-400">')
      .replace(/\x1b\[33m/g, '<span class="text-yellow-400">')
      .replace(/\x1b\[34m/g, '<span class="text-blue-400">')
      .replace(/\x1b\[35m/g, '<span class="text-purple-400">')
      .replace(/\x1b\[36m/g, '<span class="text-cyan-400">')
      .replace(/\x1b\[0m/g, '</span>')
      .replace(/===/g, '<span class="text-cyan-400">===</span>');
    
    return <div key={index} className="whitespace-pre-wrap break-all font-mono text-sm" dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
  };

  if (status === 'error') {
    return (
      <div className="flex min-h-screen bg-[#0A0E27] flex-col items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Console Unavailable</h2>
          <p className="text-slate-400 mb-6">{error || 'Unable to connect to VM console'}</p>
          <div className="flex gap-3">
            <button 
              onClick={handleRetry}
              className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button 
              onClick={handleBack}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/90 border-b border-slate-700 p-3 flex items-center gap-3 shrink-0 z-10">
        <button 
          onClick={handleBack}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">
          <Terminal className="w-4 h-4" /> VM {vmid} Console
        </div>
        <div className="flex items-center gap-2 text-sm ml-auto">
          {status === 'connected' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400">Connected</span>
            </>
          ) : status === 'connecting' ? (
            <>
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
              <span className="text-yellow-400">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-red-400">Disconnected</span>
            </>
          )}
        </div>
        <button 
          onClick={clearScreen}
          className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white transition"
        >
          Clear
        </button>
      </div>

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-auto p-4 bg-black font-mono text-sm text-green-400"
        style={{ minHeight: 0 }}
      >
        {output.length === 0 && status === 'connected' && (
          <div className="text-slate-500">Waiting for console output...</div>
        )}
        {output.map((line, i) => renderLine(line, i))}
        {status === 'connected' && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-green-400">$</span>
            <input
              ref={inputRef}
              type="text"
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent outline-none text-green-400 font-mono text-sm"
              autoFocus
              disabled={status !== 'connected'}
              placeholder="Type commands here..."
            />
          </div>
        )}
      </div>

      {/* Connection overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Connecting to VM console...</p>
            <p className="text-slate-500 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      )}
    </div>
  );
}