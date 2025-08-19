"use client";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export default function MarkdownRenderer({ content }: { content?: string | null }) {
  if (!content) return null;
  return (
    <div className="prose max-w-none prose-invert dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
