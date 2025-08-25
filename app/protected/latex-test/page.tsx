"use client";
import React from 'react';
import { SmartTextRenderer } from '@/components/latex-renderer';

/**
 * Test page to verify LaTeX rendering functionality
 */
export default function LaTeXTestPage() {
  const testCases = [
    {
      title: "Inline Math",
      content: "The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ and it's very useful."
    },
    {
      title: "Display Math", 
      content: "The integral of sine is: $$\\int \\sin(x) \\, dx = -\\cos(x) + C$$"
    },
    {
      title: "Mixed Content",
      content: "Consider the matrix $A = \\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}$ with determinant:\n\n$$\\det(A) = 1 \\cdot 4 - 2 \\cdot 3 = -2$$\n\nThis is a simple calculation."
    },
    {
      title: "Complex Expression",
      content: "The Fourier transform is: $$\\mathcal{F}\\{f(t)\\} = \\int_{-\\infty}^{\\infty} f(t) e^{-j\\omega t} \\, dt$$"
    },
    {
      title: "Code and Math",
      content: "Here's some code:\n\n```python\ndef quadratic(a, b, c):\n    return (-b + sqrt(b**2 - 4*a*c)) / (2*a)\n```\n\nAnd the math: $\\Delta = b^2 - 4ac$"
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">LaTeX Rendering Test</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        This page tests the LaTeX rendering functionality in GATE8.
      </p>
      
      <div className="space-y-8">
        {testCases.map((test, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{test.title}</h2>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded mb-4">
              <code className="text-sm">{test.content}</code>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Rendered Output:</h3>
              <SmartTextRenderer content={test.content} className="prose dark:prose-invert" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Usage Instructions</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to <code>/protected/admin/ai-question-import</code></li>
          <li>Copy the sample questions from <code>DEMO_LATEX_QUESTIONS.md</code></li>
          <li>Paste them into the question input area</li>
          <li>Click "Parse Questions" to see the AI convert them to LaTeX</li>
          <li>The rendered output will show properly formatted mathematical expressions</li>
        </ol>
      </div>
    </div>
  );
}
