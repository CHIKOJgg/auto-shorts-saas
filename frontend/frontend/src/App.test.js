import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';

function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
});

test('redirects to login when not authenticated', () => {
  renderWithProviders(<App />);
  expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
});

test('shows login page at /login', () => {
  renderWithProviders(<App />, { initialEntries: ['/login'] });
  expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
  expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
});

test('shows register page at /register', () => {
  renderWithProviders(<App />, { initialEntries: ['/register'] });
  expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
  expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
});

test('shows pricing page at /pricing', () => {
  renderWithProviders(<App />, { initialEntries: ['/pricing'] });
  expect(screen.getByText(/Simple, transparent pricing/i)).toBeInTheDocument();
});

test('shows pricing link in navbar when authenticated', () => {
  localStorage.setItem('auth_token', 'fake-token');
  renderWithProviders(<App />);
  expect(screen.getByText(/Pricing/i)).toBeInTheDocument();
});

test('shows dashboard link in navbar when authenticated', () => {
  localStorage.setItem('auth_token', 'fake-token');
  renderWithProviders(<App />);
  expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
});
