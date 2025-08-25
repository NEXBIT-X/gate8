# LaTeX Support in AI Question Parser

## Sample Input for Testing

You can now paste mathematical questions with LaTeX notation into the AI question parser. Here are some examples:

### Example 1: Calculus Question
```
1) Find the limit: What is lim(x→0) (sin(x)/x)?
A) 0
B) 1
C) ∞
D) undefined
Answer: B

Explanation: This is a standard limit that equals 1.
```

The AI will automatically convert this to:
```
What is $\lim_{x \to 0} \frac{\sin(x)}{x}$?
```

### Example 2: Physics Question
```
2) Einstein's mass-energy relation E=mc² shows the equivalence between mass and energy. 
If a particle has mass m = 2×10⁻³ kg, what is its rest energy?
(Use c = 3×10⁸ m/s)

Answer: Calculate using the formula.
```

The AI will format this as:
```
Einstein's mass-energy relation $E = mc^2$ shows the equivalence between mass and energy.
If a particle has mass $m = 2 \times 10^{-3}$ kg, what is its rest energy?
(Use $c = 3 \times 10^8$ m/s)
```

### Example 3: Advanced Mathematics
```
3) Which series converge?
A) Sum from n=1 to infinity of 1/n²
B) Sum from n=1 to infinity of 1/n
C) Sum from n=1 to infinity of 1/2ⁿ
D) Sum from n=1 to infinity of 1/n!

Answer: A, C, D
```

The AI will convert to:
```
Which series converge?
A) $\sum_{n=1}^{\infty} \frac{1}{n^2}$
B) $\sum_{n=1}^{\infty} \frac{1}{n}$
C) $\sum_{n=1}^{\infty} \frac{1}{2^n}$
D) $\sum_{n=1}^{\infty} \frac{1}{n!}$
```

## How to Use

1. Go to the AI Question Import page in the admin panel
2. Paste questions with mathematical notation
3. The AI parser will automatically detect and convert mathematical expressions to LaTeX
4. The rendered questions will display beautiful mathematical formulas using KaTeX
5. Both inline math ($...$) and display math ($$...$$) are supported

## Supported LaTeX Features

- **Basic Operations**: +, -, ×, ÷, =, ≠, <, >, ≤, ≥
- **Fractions**: `\frac{numerator}{denominator}`
- **Exponents**: `x^2`, `e^{-x}`
- **Radicals**: `\sqrt{x}`, `\sqrt[n]{x}`
- **Greek Letters**: `\alpha`, `\beta`, `\gamma`, `\pi`, `\theta`, etc.
- **Calculus**: `\int`, `\sum`, `\lim`, `\frac{d}{dx}`, `\partial`
- **Set Theory**: `\in`, `\subset`, `\cup`, `\cap`, `\emptyset`
- **Logic**: `\land`, `\lor`, `\neg`, `\implies`, `\iff`
- **Functions**: `\sin`, `\cos`, `\tan`, `\log`, `\ln`, `\exp`
- **Matrices**: `\begin{pmatrix}...\end{pmatrix}`
- **Complexity**: `O(n)`, `\Theta(n)`, `\Omega(n)`

The system automatically detects mathematical content and applies appropriate LaTeX formatting for optimal rendering in tests and results.
