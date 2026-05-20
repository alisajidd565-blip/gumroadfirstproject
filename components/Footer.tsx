import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
              <Zap size={13} className="text-slate-950" fill="currentColor" />
            </div>
            <span className="text-sm font-semibold text-slate-400">
              ContentRepurposer AI
            </span>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-slate-500">
            <Link href="/#features" className="hover:text-slate-300 transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="hover:text-slate-300 transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">
              Sign up
            </Link>
          </nav>
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} ContentRepurposer AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
