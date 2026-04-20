import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App shell', () => {
  it('renders the seeded demo control loop', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /agent studio/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^runtime$/i)).toHaveValue('demo');
    expect(screen.getByLabelText(/^workflow$/i)).toHaveDisplayValue(/weekly operations brief/i);
    expect(screen.getByRole('heading', { level: 2, name: /^live, replay, optimize$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /how agent studio works/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^live$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^replay$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^optimize$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /weekly operations brief/i })).toBeInTheDocument();
    expect(screen.getAllByText(/guardrailed candidate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/promoted the tighter fan-out plan/i)).toBeInTheDocument();
  });
});
