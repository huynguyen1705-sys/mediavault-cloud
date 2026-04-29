'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Setup pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
import { Play, Pause, Volume2, Maximize2, FileCode, FileText, FileSpreadsheet, Music } from 'lucide-react';

// Audio Preview - Native player (auto-stops when modal closes)
function AudioPreview({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Force stop when component unmounts
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl w-full max-w-2xl">
      <audio ref={audioRef} src={url} />
      
      <div className="flex flex-col items-center gap-6">
        {/* Icon */}
        <div className={`w-24 h-24 rounded-full bg-violet-600/20 flex items-center justify-center ${isPlaying ? 'animate-pulse' : ''}`}>
          <Music className={`w-12 h-12 text-violet-400 ${isPlaying ? 'animate-bounce' : ''}`} />
        </div>
        
        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          className="w-16 h-16 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-all hover:scale-105"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>
        
        {/* Progress */}
        <div className="w-full space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Volume */}
        <div className="flex items-center gap-3 w-full">
          <Volume2 className="w-5 h-5 text-gray-500" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
        </div>
      </div>
    </div>
  );
}

// PDF Preview
function PdfPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const pdfDocRef = useRef<any>(null);

  const loadPdfPage = async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  };

  useEffect(() => {
    const loadPdf = async () => {
      try {
        // Use proxy endpoint to bypass CORS
        const proxyUrl = url.includes('/proxy') ? url : `/api/files/${url.split('/').pop()}/proxy`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Proxy failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
        loadPdfPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError(true);
        setLoading(false);
      }
    };

    loadPdf();
  }, [url]);

  useEffect(() => {
    if (!loading && currentPage > 0) {
      loadPdfPage(currentPage);
    }
  }, [currentPage, scale, loading]);

  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(numPages, p + 1));
  const zoomIn = () => setScale(s => Math.min(3, s + 0.25));
  const zoomOut = () => setScale(s => Math.max(0.5, s - 0.25));

  return (
    <div className="bg-gray-900 rounded-2xl p-4 shadow-2xl w-full max-w-4xl">
      {/* PDF Controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-300 text-sm">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4 text-gray-400 rotate-90" />
          </button>
          <span className="text-gray-400 text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex justify-center overflow-auto max-h-[60vh] bg-gray-800 rounded-lg p-2">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto" />
        )}
      </div>
    </div>
  );
}

// Code File Preview with Syntax Highlighting
function CodePreview({ url, filename }: { url: string; filename: string }) {
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');
        const text = await response.text();
        setCode(text.slice(0, 5000)); // Limit to first 5000 chars
        setLoading(false);
      } catch (err) {
        console.error('Error fetching code:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchCode();
  }, [url]);

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'c',
      cs: 'csharp', go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
      swift: 'swift', kt: 'kotlin', scala: 'scala', html: 'html',
      css: 'css', scss: 'scss', json: 'json', xml: 'xml',
      yaml: 'yaml', yml: 'yaml', sql: 'sql', sh: 'bash',
      bash: 'bash', zsh: 'bash', ps1: 'powershell', bat: 'batch',
      md: 'markdown', log: 'plaintext', env: 'plaintext',
    };
    return langMap[ext] || 'plaintext';
  };

  // Simple syntax highlighting function
  const highlightCode = (code: string, language: string) => {
    // Basic token-based highlighting
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'def', 'self', 'lambda', 'with', 'as', 'in', 'not', 'and', 'or', 'pass', 'break', 'continue', 'raise', 'except', 'finally', 'yield'];
    const stringRegex = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g;
    const commentRegex = /\/\/.*$|\/\*[\s\S]*?\*\/|#.*$/gm;
    const numberRegex = /\b\d+\.?\d*\b/g;
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');

    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply highlighting
    highlighted = highlighted
      .replace(commentRegex, '<span class="text-gray-500">$&</span>')
      .replace(stringRegex, '<span class="text-green-400">$&</span>')
      .replace(numberRegex, '<span class="text-amber-400">$&</span>')
      .replace(keywordRegex, '<span class="text-violet-400">$&</span>');

    return highlighted;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <FileCode className="w-5 h-5 text-violet-400" />
          <span className="text-gray-300 font-medium">{filename}</span>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-4xl text-center">
        <FileCode className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Unable to load code preview</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <FileCode className="w-5 h-5 text-violet-400" />
          <span className="text-gray-300 font-medium">{filename}</span>
          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded">
            {getLanguage(filename)}
          </span>
        </div>
        <span className="text-gray-500 text-sm">{code.split('\n').length} lines</span>
      </div>

      {/* Code Content */}
      <div className="overflow-auto max-h-[60vh]">
        <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto">
          <code
            dangerouslySetInnerHTML={{
              __html: highlightCode(code, getLanguage(filename))
            }}
          />
        </pre>
      </div>
    </div>
  );
}

// Text File Preview
function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');
        const text = await response.text();
        setContent(text.slice(0, 10000)); // Limit to first 10000 chars
        setLoading(false);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300 font-medium">Text Preview</span>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-4xl text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Unable to load text preview</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300 font-medium">Text File</span>
        </div>
        <span className="text-gray-500 text-sm">{content.length} characters</span>
      </div>

      {/* Content */}
      <div className="overflow-auto max-h-[60vh]">
        <pre className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap text-gray-300 overflow-x-auto">
          {content}
        </pre>
      </div>
    </div>
  );
}

export { AudioPreview, PdfPreview, CodePreview, TextPreview, XlsxPreview };

// XLSX/Spreadsheet Preview
function XlsxPreview({ url }: { url: string }) {
  const [sheets, setSheets] = useState<any[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadXlsx = async () => {
      try {
        const XLSX = await import('xlsx');
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        
        const sheetsData = workbook.SheetNames.map((name, idx) => {
          const sheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          return { name, data: jsonData };
        });
        
        setSheets(sheetsData);
        setLoading(false);
      } catch (err) {
        console.error('XLSX load error:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadXlsx();
  }, [url]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-4xl">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-4xl text-center">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Unable to load spreadsheet</p>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];
  const maxRows = 50;
  const displayData = currentSheet.data.slice(0, maxRows);

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl w-[90vw] max-w-6xl overflow-hidden">
      {/* Header with sheet tabs */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
        <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex items-center gap-2 overflow-x-auto">
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheet(idx)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                idx === activeSheet 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table - single scrollbar only */}
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-4 py-2 text-left text-gray-400 font-medium border-r border-gray-700 sticky top-0 bg-gray-800 w-12">#</th>
              {displayData[0]?.map((_: any, colIdx: number) => (
                <th key={colIdx} className="px-4 py-2 text-left text-gray-400 font-medium border-r border-gray-700 sticky top-0 bg-gray-800 min-w-[120px]">
                  {String.fromCharCode(65 + (colIdx % 26))}{colIdx >= 26 ? Math.floor(colIdx / 26) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row: any[], rowIdx: number) => (
              <tr key={rowIdx} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-4 py-2 text-gray-500 border-r border-gray-700 bg-gray-900 w-12">{rowIdx + 1}</td>
                {(row || []).map((cell: any, colIdx: number) => (
                  <td key={colIdx} className="px-4 py-2 text-gray-200 border-r border-gray-800 whitespace-nowrap">
                    {cell !== null && cell !== undefined ? String(cell).slice(0, 100) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {currentSheet.data.length > maxRows && (
          <div className="px-4 py-3 text-center text-gray-500 text-sm bg-gray-800 border-t border-gray-700">
            Showing {maxRows} of {currentSheet.data.length} rows
          </div>
        )}
      </div>
    </div>
  );
}
