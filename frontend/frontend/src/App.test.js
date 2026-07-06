import { render, screen } from '@testing-library/react';
import AppWithBoundary from './App';

test('renders the upload form', () => {
  render(<AppWithBoundary />);
  expect(screen.getByText(/Shorts AI/i)).toBeInTheDocument();
  expect(screen.getByText(/Generate Metadata/i)).toBeInTheDocument();
});

test('shows video title input', () => {
  render(<AppWithBoundary />);
  expect(screen.getByLabelText(/Video Title/i)).toBeInTheDocument();
});
