"use client";
import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export interface LaTeXRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
}

/**
 * LaTeX/KaTeX renderer for mathematical expressions
 * Supports both inline and block math rendering
 */
export default function LaTeXRenderer({ content, inline = false, className = "" }: LaTeXRendererProps) {
  if (!content) return null;

  try {
    if (inline) {
      return (
        <span className={`inline-math ${className}`}>
          <InlineMath math={content} />
        </span>
      );
    } else {
      return (
        <div className={`block-math text-center my-4 ${className}`}>
          <BlockMath math={content} />
        </div>
      );
    }
  } catch (error) {
    console.error('LaTeX rendering error:', error);
    // Fallback to raw text with error styling
    return (
      <span className={`latex-error text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-sm ${className}`}>
        LaTeX Error: {content}
      </span>
    );
  }
}

/**
 * Parse and render text that may contain LaTeX expressions
 * Supports inline math ($...$) and display math ($$...$$)
 */
export function parseAndRenderLaTeX(text: string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // First, handle display math ($$...$$)
  const displayMathRegex = /\$\$([^$]+)\$\$/g;
  let displayMatch;
  
  while ((displayMatch = displayMathRegex.exec(text)) !== null) {
    const startIndex = displayMatch.index;
    const endIndex = displayMathRegex.lastIndex;

    // Add text before the math
    if (startIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, startIndex);
      nodes.push(...parseInlineMath(beforeText, nodes.length));
    }

    // Add display math
    nodes.push(
      <LaTeXRenderer 
        key={`display-${nodes.length}`} 
        content={displayMatch[1].trim()} 
        inline={false} 
      />
    );

    lastIndex = endIndex;
  }

  // Handle remaining text after all display math
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    nodes.push(...parseInlineMath(remainingText, nodes.length));
  }

  return nodes;
}

/**
 * Parse inline math expressions ($...$) from text
 */
function parseInlineMath(text: string, startKey: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // Handle inline math ($...$) but not display math ($$...$$)
  const inlineMathRegex = /(?<!\$)\$([^$]+)\$(?!\$)/g;
  let inlineMatch;

  while ((inlineMatch = inlineMathRegex.exec(text)) !== null) {
    const startIndex = inlineMatch.index;
    const endIndex = inlineMathRegex.lastIndex;

    // Add text before the math
    if (startIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, startIndex);
      if (beforeText) {
        nodes.push(
          <span key={`text-${startKey + nodes.length}`}>
            {beforeText}
          </span>
        );
      }
    }

    // Add inline math
    nodes.push(
      <LaTeXRenderer 
        key={`inline-${startKey + nodes.length}`} 
        content={inlineMatch[1].trim()} 
        inline={true} 
      />
    );

    lastIndex = endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      nodes.push(
        <span key={`text-${startKey + nodes.length}`}>
          {remainingText}
        </span>
      );
    }
  }

  return nodes;
}

/**
 * Smart text renderer that handles LaTeX, code blocks, and regular text
 */
export function SmartTextRenderer({ 
  content, 
  className = "" 
}: { 
  content: string | null | undefined; 
  className?: string 
}): React.ReactNode {
  if (!content) return null;

  // Handle code blocks first
  const codeBlockRegex = /```(?:([\w+-]+)\n)?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const beforeText = content.slice(lastIndex, match.index);
    
    // Process text before code block for LaTeX
    if (beforeText) {
      parts.push(
        <span key={`before-${parts.length}`} className={className}>
          {parseAndRenderLaTeX(beforeText)}
        </span>
      );
    }

    // Add code block
    const language = match[1] || '';
    const code = match[2] || '';
    parts.push(
      <pre key={`code-${parts.length}`} className="bg-gray-800 dark:bg-gray-900 p-3 rounded font-mono whitespace-pre text-sm overflow-auto my-2">
        <code className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    );

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Process remaining text for LaTeX
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText) {
      parts.push(
        <span key={`remaining-${parts.length}`} className={className}>
          {parseAndRenderLaTeX(remainingText)}
        </span>
      );
    }
  }

  return parts.length > 0 ? <div className="smart-text-container">{parts}</div> : null;
}
