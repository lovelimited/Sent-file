import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-6xl font-extrabold text-slate-800 tracking-tight">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-slate-200">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
      >
        <Home className="h-4 w-4" />
        Return to Dashboard
      </Link>
    </div>
  )
}
