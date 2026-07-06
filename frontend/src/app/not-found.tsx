import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-slate-200 mb-4">404</p>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
