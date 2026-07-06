import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || '';

const CHECKOUT_TIER_MAP = { pro: 'pro', enterprise: 'enterprise' };

function PlanCard({ plan, currentTier, onSubscribe, loading }) {
  const isCurrent = plan.id === currentTier;
  const isFree = plan.id === 'free';

  return (
    <div
      className={`rounded-xl border p-6 flex flex-col ${
        isCurrent
          ? 'border-indigo-500 bg-indigo-500/5'
          : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-400">{plan.description}</p>

      <div className="mt-4">
        <span className="text-3xl font-bold text-white">
          ${(plan.priceCents / 100).toFixed(0)}
        </span>
        <span className="text-slate-400 text-sm">/month</span>
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {isFree ? (
        <button
          disabled
          className="mt-6 w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
        >
          {isCurrent ? 'Current Plan' : 'Free'}
        </button>
      ) : (
        <button
          onClick={() => onSubscribe(plan.id)}
          disabled={loading || isCurrent}
          className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            isCurrent
              ? 'bg-indigo-600/50 text-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {loading ? 'Redirecting...' : isCurrent ? 'Current Plan' : 'Subscribe'}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/subscriptions/plans`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans))
      .catch(() => setError('Failed to load plans'));

    if (user) {
      fetch(`${API_URL}/api/subscriptions/current`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => r.json())
        .then((data) => setCurrentTier(data.tier))
        .catch(() => {});
    }
  }, [user, getToken]);

  const handleSubscribe = async (tier) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(tier);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');

      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Choose the plan that fits your content creation needs
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            loading={loading === plan.id}
          />
        ))}
      </div>
    </div>
  );
}
