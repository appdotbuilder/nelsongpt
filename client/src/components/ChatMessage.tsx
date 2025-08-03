
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, User, Bot, Copy, Check } from 'lucide-react';
import type { Message } from '../../../server/src/schema';

interface ChatMessageProps {
  message: Message;
  showTimestamps: boolean;
  showCitations: boolean;
}

export function ChatMessage({ message, showTimestamps, showCitations }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Fade-in animation for assistant messages
  useEffect(() => {
    if (message.role === 'assistant') {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [message.role]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 group ${isUser ? 'justify-end' : 'justify-start'} ${
      isVisible ? 'animate-in fade-in duration-500' : 'opacity-0'
    }`}>
      {!isUser && (
        <Avatar className="shrink-0 mt-1">
          <AvatarFallback className="bg-blue-500 text-white">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {/* Message Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'NelsonGPT'}
          </span>
          {showTimestamps && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {message.created_at.toLocaleTimeString()}
            </div>
          )}
          {message.metadata?.model_used && (
            <Badge variant="outline" className="text-xs border-[#2a2a2a] text-gray-400">
              {message.metadata.model_used}
            </Badge>
          )}
        </div>

        {/* Message Content */}
        <div className={`rounded-lg p-4 relative ${
          isUser 
            ? 'bg-[#2a2a2a] text-[#f2f2f2]' 
            : 'bg-gradient-to-br from-gray-800 to-gray-900 text-[#f2f2f2] shadow-lg'
        }`}>
          <div className="prose prose-invert max-w-none">
            <MarkdownRenderer content={message.content} />
          </div>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-gray-400 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>

          {/* Citations */}
          {showCitations && message.metadata?.citations && message.metadata.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Sources</span>
              </div>
              <div className="space-y-1">
                {message.metadata.citations.map((citation, index) => (
                  <div key={index} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                    {citation.source}
                    {citation.page && `, pg. ${citation.page}`}
                    {citation.chapter && ` - ${citation.chapter}`}
                    {citation.relevance_score && (
                      <Badge variant="secondary" className="text-xs ml-2 bg-[#2a2a2a]">
                        {Math.round(citation.relevance_score * 100)}% match
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {message.metadata && (message.metadata.tokens_used || message.metadata.processing_time_ms) && (
            <div className="mt-3 pt-2 border-t border-[#2a2a2a] flex items-center gap-4 text-xs text-gray-500">
              {message.metadata.tokens_used && (
                <span>{message.metadata.tokens_used} tokens</span>
              )}
              {message.metadata.processing_time_ms && (
                <span>{message.metadata.processing_time_ms}ms</span>
              )}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="shrink-0 mt-1">
          <AvatarFallback className="bg-[#2a2a2a] text-white">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// Simple Markdown renderer component
function MarkdownRenderer({ content }: { content: string }) {
  // Basic markdown parsing for headings, lists, code blocks, and links
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const result: React.ReactElement[] = [];
    let currentList: string[] = [];
    let codeBlockContent: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';

    const flushList = () => {
      if (currentList.length > 0) {
        result.push(
          <ul key={`list-${result.length}`} className="list-disc pl-5 my-2 space-y-1">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm">{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        result.push(
          <div key={`code-${result.length}`} className="my-3">
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              {codeLanguage && (
                <div className="bg-slate-800 px-3 py-1 text-xs text-gray-300 border-b border-slate-700">
                  {codeLanguage}
                </div>
              )}
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-green-400 font-mono">
                  {codeBlockContent.join('\n')}
                </code>
              </pre>
            </div>
          </div>
        );
        codeBlockContent = [];
        codeLanguage = '';
      }
    };

    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Handle headings
      if (line.startsWith('###')) {
        flushList();
        result.push(
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-blue-400">
            {line.slice(3).trim()}
          </h3>
        );
      } else if (line.startsWith('##')) {
        flushList();
        result.push(
          <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-blue-400">
            {line.slice(2).trim()}
          </h2>
        );
      } else if (line.startsWith('#')) {
        flushList();
        result.push(
          <h1 key={index} className="text-2xl font-bold mt-4 mb-2 text-blue-400">
            {line.slice(1).trim()}
          </h1>
        );
      }
      // Handle list items
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        currentList.push(line.slice(2).trim());
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line)) {
        currentList.push(line.replace(/^\d+\.\s/, ''));
      }
      // Handle inline code
      else if (line.includes('`')) {
        flushList();
        result.push(
          <p key={index} className="my-2">
            {renderInlineMarkdown(line)}
          </p>
        );
      }
      // Handle empty lines
      else if (line.trim() === '') {
        flushList();
        if (result.length > 0) {
          result.push(<br key={`br-${index}`} />);
        }
      }
      // Handle regular paragraphs
      else {
        flushList();
        result.push(
          <p key={index} className="my-2">
            {renderInlineMarkdown(line)}
          </p>
        );
      }
    });

    // Flush any remaining content
    flushList();
    flushCodeBlock();

    return result;
  };

  const renderInlineMarkdown = (text: string): React.ReactElement => {
    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-green-400 font-mono text-sm">$1</code>');
    
    // Handle bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Handle italic text
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    
    // Handle links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return <div className="markdown-content">{renderMarkdown(content)}</div>;
}
