'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Play, Pause, Volume2, Maximize2, FileCode, FileText } from 'lucide-react';

// Audio Preview with Waveform
function AudioPreview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let wavesurfer: any = null;

    const initWaveSurfer = async () => {
      if (!containerRef.current) return;
      
      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;
        
        if (!mounted) return;
        
        wavesurfer = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#8b5cf6',
          progressColor: '#a78bfa',
          cursorColor: '#c4b5fd',
          barWidth: 2,
          barGap: 3,
          barRadius: 3,
          height: 100,
          normalize: true,
        });

        wavesurferRef.current = wavesurfer;
        wavesurfer.load(url);
        
        wavesurfer.on('ready', () => {
          if (mounted) setLoading(false);
        });

        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('finish', () => setIsPlaying(false));
      } catch (error) {
        console.error('WaveSurfer init error:', error);
        if (mounted) setLoading(false);
      }
    };

    initWaveSurfer();

    return () => {
      mounted = false;
      if (wavesurfer) {
        wavesurfer.stop();
        wavesurfer.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [url]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-2xl">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors"
          disabled={loading}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </button>
        <div className="flex-1">
          <p className="text-white font-medium">Audio Preview</p>
          <p className="text-gray-400 text-sm">Waveform visualization</p>
        </div>
        <Volume2 className="w-5 h-5 text-gray-500" />
      </div>
      
      {loading && (
        <div className="h-24 flex items-center justify-center">
          <div className="animate-pulse flex gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-violet-500 rounded-full animate-pulse"
                style={{ height: `${Math.random() * 60 + 20}px`, animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

// PDF Preview
function PdfPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
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
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
        loadPdfPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
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

export { AudioPreview, PdfPreview, CodePreview, TextPreview };
