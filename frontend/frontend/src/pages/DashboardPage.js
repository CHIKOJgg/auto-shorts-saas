import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '';

export default function DashboardPage() {
  const { getToken, user } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    Promise.all([
      fetch(`${API_URL}/api/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API_URL}/api/history?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([subData, histData]) => {
        setData(subData);
        setHistory(histData.data || []);
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [getToken]);

  const handleBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      window.location.href = result.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  const usagePercent = data?.usage?.limit > 0
    ? Math.round((data.usage.used / data.usage.limit) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Plan
          </h2>
          <p className="mt-2 text-2xl font-bold text-white capitalize">
            {data?.tier || 'Free'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Status: <span className="text-green-400">{data?.status || 'active'}</span>
          </p>
          {data?.tier !== 'free' && (
            <button
              onClick={handleBillingPortal}
              disabled={portalLoading}
              className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 underline"
            >
              {portalLoading ? 'Loading...' : 'Manage billing'}
            </button>
          )}
        </div>

        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Monthly Usage
          </h2>
          <div className="mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">
                {data?.usage?.used || 0} / {data?.usage?.limit === -1 ? '∞' : data?.usage?.limit || 5}
              </span>
              <span className="text-slate-400">
                {data?.usage?.limit === -1 ? '' : `${usagePercent}%`}
              </span>
            </div>
            {data?.usage?.limit !== -1 && (
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usagePercent >= 80 ? 'bg-red-500' : usagePercent >= 50 ? 'bg-yellow-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </div>
          {data?.usage?.limit !== -1 && data?.usage?.remaining !== 'Unlimited' && (
            <p className="mt-3 text-xs text-slate-500">
              {data.usage.remaining} generations remaining this month
            </p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Generations</h2>
          {data?.tier === 'free' && (
            <Link
              to="/pricing"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline"
            >
              Upgrade for more
            </Link>
          )}
        </div>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No generations yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-lg bg-slate-800/30 border border-slate-700/50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {item.description && (
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
