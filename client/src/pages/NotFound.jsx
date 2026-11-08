import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you were looking for does not exist or has moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-2">
        Go to dashboard
      </Link>
    </div>
  );
}
