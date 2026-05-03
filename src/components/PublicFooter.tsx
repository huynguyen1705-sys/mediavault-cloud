export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-800 bg-black">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                F
              </div>
              <span className="text-lg font-semibold text-white">fii.one</span>
            </a>
            <p className="text-sm text-gray-500 leading-relaxed">
              Secure cloud storage for your media files. Upload, share, and access anywhere.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="/features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/register" className="text-sm text-gray-400 hover:text-white transition-colors">Get Started</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><a href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a></li>
              <li><a href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/refund" className="text-sm text-gray-400 hover:text-white transition-colors">Refund Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2026 fii.one. All rights reserved.</p>
          <p className="text-sm text-gray-600">Made with ❤️ for creators worldwide</p>
        </div>
      </div>
    </footer>
  );
}
