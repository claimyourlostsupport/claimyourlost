import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="text-center py-20 space-y-6 max-w-md mx-auto">
      <p className="text-7xl font-bold text-slate-200">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-600">That page does not exist or was moved.</p>
      <Link
        to="/"
        className="inline-flex px-6 py-3 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800"
      >
        Back to home
      </Link>
    </div>
  );
}
