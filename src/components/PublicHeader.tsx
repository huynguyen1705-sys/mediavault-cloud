import { Sparkles, CreditCard, Users, Mail, Code } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
            F
          </div>
          <span className="text-lg font-semibold text-white">fii.one</span>
        </a>
        <nav className="hidden md:flex items-center gap-6">
          <a href="/features" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Features
          </a>
          <a href="/pricing" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Pricing
          </a>
          <a href="/developers" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Code className="w-4 h-4 text-cyan-400" />
            API
          </a>
          <a href="/about" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Users className="w-4 h-4 text-blue-400" />
            About
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</a>
          <a href="/register" className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-colors btn-press">
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
