import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import React from 'react';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
});
