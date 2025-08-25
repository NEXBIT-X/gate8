"use client";
import React, { useState, useRef, useEffect } from 'react';
import { SmartTextRenderer } from './latex-renderer';

interface LaTeXEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  rows?: number;
}

/**
 * LaTeX-aware editor with live preview
 */
export default function LaTeXEditor({ 
  value, 
  onChange, 
  placeholder = "Enter text with LaTeX...", 
  className = "",
  label,
  rows = 4
}: LaTeXEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const insertLaTeX = (latex: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = value;
      const newText = text.substring(0, start) + latex + text.substring(end);
      onChange(newText);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = start + latex.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const commonLaTeX = [
    { label: "x²", latex: "$x^2$" },
    { label: "√x", latex: "$\\sqrt{x}$" },
    { label: "a/b", latex: "$\\frac{a}{b}$" },
    { label: "∫", latex: "$\\int$" },
    { label: "∑", latex: "$\\sum$" },
    { label: "lim", latex: "$\\lim_{x \\to \\infty}$" },
    { label: "α", latex: "$\\alpha$" },
    { label: "β", latex: "$\\beta$" },
    { label: "γ", latex: "$\\gamma$" },
    { label: "Δ", latex: "$\\Delta$" },
    { label: "sin", latex: "$\\sin$" },
    { label: "cos", latex: "$\\cos$" },
    { label: "Matrix", latex: "$\\begin{bmatrix}a & b\\\\c & d\\end{bmatrix}$" },
    { label: "±", latex: "$\\pm$" },
    { label: "∞", latex: "$\\infty$" },
    { label: "Display", latex: "$$  $$" }
  ];

  return (
    <div className={`latex-editor ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-2">{label}</label>
      )}
      
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2 py-1 text-xs rounded ${
            showPreview 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
        
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        
        {commonLaTeX.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => insertLaTeX(item.latex)}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
            title={`Insert ${item.latex}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="grid grid-cols-1 gap-4">
        <div className={showPreview ? 'lg:grid lg:grid-cols-2 lg:gap-4' : ''}>
          {/* Input */}
          <div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              placeholder={placeholder}
              rows={rows}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden font-mono text-sm"
            />
            <div className="text-xs text-gray-500 mt-1">
              Use $...$ for inline math, $$...$$ for display math
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="border rounded-lg p-3 bg-white dark:bg-gray-900 min-h-[6rem]">
              <div className="text-xs text-gray-500 mb-2">Live Preview:</div>
              <div className="prose dark:prose-invert max-w-none">
                <SmartTextRenderer content={value || "Type something to see preview..."} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help */}
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          LaTeX Help & Examples
        </summary>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Basic Math:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code>$x^2$</code> → x²</li>
                <li><code>$x_i$</code> → xᵢ</li>
                <li><code>$\frac{`{a}`}{`{b}`}$</code> → a/b</li>
                <li><code>$\sqrt{`{x}`}$</code> → √x</li>
              </ul>
            </div>
            <div>
              <strong>Advanced:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code>$\int_{`{a}`}^{`{b}`} f(x) dx$</code> → integral</li>
                <li><code>$\sum_{`{i=1}`}^{`{n}`} x_i$</code> → summation</li>
                <li><code>$\lim_{`{x \to \infty}`}$</code> → limit</li>
                <li><code>$$...$$</code> → display math</li>
              </ul>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

/**
 * Simple LaTeX input field for single-line expressions
 */
export function LaTeXInput({ 
  value, 
  onChange, 
  placeholder = "Enter LaTeX expression...", 
  className = "",
  label
}: Omit<LaTeXEditorProps, 'rows'>) {
  return (
    <LaTeXEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      label={label}
      rows={1}
    />
  );
}
