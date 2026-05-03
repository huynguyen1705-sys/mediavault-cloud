import Navbar from "@/components/layout/navbar";
import HomeUpload from "@/components/HomeUpload";
import PublicFooter from "@/components/PublicFooter";
import {
  Cloud,
  Shield,
  Zap,
  Image,
  Video,
  Music,
  Link as LinkIcon,
  Lock,
  Share2,
  Download,
  ArrowRight,
  Check,
  Upload,
  Globe,
  Clock,
  Users,
  Star,
  HardDrive,
  Eye,
  Smartphone,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: Image,
      title: "Image Storage",
      description: "Store JPG, PNG, WebP, GIF, HEIC with metadata extraction",
    },
    {
      icon: Video,
      title: "Video Hosting",
      description: "Upload MP4, MOV, WebM with HLS streaming player",
    },
    {
      icon: Music,
      title: "Audio Files",
      description: "Store MP3, WAV, M4A with built-in audio player",
    },
    {
      icon: Shield,
      title: "Secure Storage",
      description: "Signed URLs, anti-hotlink, no direct R2 exposure",
    },
    {
      icon: Share2,
      title: "Share System",
      description: "Password protected, expiring, view-only links",
    },
    {
      icon: Download,
      title: "Download Control",
      description: "Track downloads, bandwidth limits per plan",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: ["5 GB Storage", "200 MB max file size", "10 GB Bandwidth/mo", "Basic sharing", "7 day file retention"],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$4.99",
      period: "/month",
      features: ["100 GB Storage", "2 GB max file size", "500 GB Bandwidth/mo", "Permanent storage", "Advanced sharing & passwords", "Priority support", "No ads"],
      cta: "Upgrade to Pro",
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-12 md:pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-xs md:text-sm font-medium mb-6">
            <Zap className="w-3 h-3 md:w-4 md:h-4" />
            Cloud Media Storage
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Store & Share
            </span>
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Media Files
            </span>
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Securely
            </span>
          </h1>

          <p className="text-base md:text-lg lg:text-xl text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto px-4">
            Upload images, videos, and audio files. Get secure share links with password protection.
          </p>

          {/* Buttons - 2 columns on mobile */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-md mx-auto px-4 mb-8 md:mb-0">
            <a
              href="/register"
              className="px-4 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm md:text-base font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all btn-press hover:shadow-lg hover:shadow-violet-500/25"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/pricing"
              className="px-4 py-2.5 md:px-6 md:py-3 bg-gray-800 hover:bg-gray-700 text-white text-sm md:text-base font-medium rounded-lg transition-all"
            >
              View Pricing
            </a>
          </div>

          {/* Upload Component */}
          <HomeUpload />

          {/* Mock Preview - Hide on small mobile */}
          <div className="mt-10 md:mt-16 relative hidden sm:block">
            <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl p-1">
              <div className="bg-[#111111] rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-4 mb-4 md:mb-6">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500" />
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-500">fii.one</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-gray-800 rounded-lg md:rounded-xl overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 md:py-20 px-4 bg-[#111111]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold mb-2">Everything You Need</h2>
            <p className="text-gray-400 text-sm md:text-lg">Professional media storage</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-4 md:p-6 bg-[#111111] border border-gray-800 rounded-xl md:rounded-2xl hover:border-violet-500/50 card-hover"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-violet-500/10 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-violet-400" />
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-xs md:text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 1: How It Works */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto">Get started in seconds — no complicated setup needed</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Upload, title: "Upload Files", desc: "Drag and drop or select files. Support for images, videos, audio, documents and more. Up to 5GB per file." },
              { step: "02", icon: Share2, title: "Get Share Link", desc: "Every file gets a short URL instantly. Add password protection or set expiration. Full control over access." },
              { step: "03", icon: Download, title: "Share Anywhere", desc: "Send the link to anyone. They can preview and download directly. Track views and downloads in real-time." },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="text-6xl font-bold text-gray-800/50 mb-4">{item.step}</div>
                <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 2: Security & Trust */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Enterprise-Grade Security
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Your Files Are Safe With Us</h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Built on Cloudflare's global infrastructure with end-to-end encryption. Your files are stored across multiple regions with automatic redundancy.
              </p>
              <ul className="space-y-4">
                {[
                  "AES-256 encryption at rest",
                  "TLS 1.3 encryption in transit",
                  "No third-party access to your data",
                  "SOC 2 compliant infrastructure",
                  "Automatic backups across regions",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300">
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: "99.99%", label: "Uptime SLA", icon: Clock },
                  { value: "256-bit", label: "Encryption", icon: Lock },
                  { value: "50+", label: "Edge Locations", icon: Globe },
                  { value: "<50ms", label: "Avg Response", icon: Zap },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4">
                    <stat.icon className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Block 3: Stats / Social Proof */}
      <section className="py-16 md:py-20 px-4 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "100K+", label: "Files Stored" },
              { value: "10K+", label: "Active Users" },
              { value: "99.9%", label: "Uptime" },
              { value: "150+", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 4: Use Cases */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">Built for Everyone</h2>
            <p className="text-gray-400 text-sm md:text-lg">From freelancers to enterprise teams</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Photographers",
                desc: "Share high-res photos with clients. Password-protected galleries with download control. No compression, original quality preserved.",
                gradient: "from-amber-500/20 to-orange-500/10",
                icon: Image,
              },
              {
                title: "Video Creators",
                desc: "Upload large video files up to 5GB. Stream previews directly in browser. Share rushes and final cuts with your team.",
                gradient: "from-violet-500/20 to-purple-500/10",
                icon: Video,
              },
              {
                title: "Teams & Businesses",
                desc: "Centralized media library for your team. Organized folders, shared access, bandwidth monitoring. Scale as you grow.",
                gradient: "from-blue-500/20 to-cyan-500/10",
                icon: Users,
              },
            ].map((useCase) => (
              <div key={useCase.title} className={`bg-gradient-to-br ${useCase.gradient} border border-gray-800 rounded-2xl p-8`}>
                <useCase.icon className="w-10 h-10 text-white/80 mb-4" />
                <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 5: Testimonials */}
      <section className="py-16 md:py-24 px-4 bg-[#111111]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">Loved by Creators</h2>
            <p className="text-gray-400 text-sm md:text-lg">See what our users are saying</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah M.",
                role: "Photographer",
                text: "Finally a storage service that doesn't compress my RAW files. The share links are clean and professional — my clients love it.",
                stars: 5,
              },
              {
                name: "Alex K.",
                role: "Video Editor",
                text: "Uploading 4K footage used to be painful. fii.one handles large files like a champ. The preview feature saves me so much time.",
                stars: 5,
              },
              {
                name: "David L.",
                role: "Marketing Lead",
                text: "We switched our team from Google Drive. The branded share links and download tracking give us way more control over our assets.",
                stars: 5,
              },
            ].map((testimonial) => (
              <div key={testimonial.name} className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 6: Comparison */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">Why fii.one?</h2>
            <p className="text-gray-400 text-sm md:text-lg">See how we compare to traditional cloud storage</p>
          </div>
          <div className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 gap-0 border-b border-gray-800 p-4 md:p-6">
              <div className="text-sm text-gray-500">Feature</div>
              <div className="text-sm font-semibold text-center text-violet-400">fii.one</div>
              <div className="text-sm text-gray-500 text-center">Others</div>
            </div>
            {[
              { feature: "Short share links", us: true, them: false },
              { feature: "Password protection", us: true, them: "Paid only" },
              { feature: "No file compression", us: true, them: false },
              { feature: "Download tracking", us: true, them: false },
              { feature: "Link expiration", us: true, them: "Limited" },
              { feature: "Mobile optimized", us: true, them: "Partial" },
              { feature: "Fast global CDN", us: true, them: "Varies" },
            ].map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 gap-0 p-4 md:p-5 ${i % 2 === 0 ? 'bg-gray-900/30' : ''}`}>
                <div className="text-sm text-gray-300">{row.feature}</div>
                <div className="text-center">
                  {row.us === true ? (
                    <div className="inline-flex w-5 h-5 bg-green-500/20 rounded-full items-center justify-center">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                  ) : <span className="text-sm text-gray-400">{String(row.us)}</span>}
                </div>
                <div className="text-center">
                  {row.them === false ? (
                    <span className="text-sm text-gray-600">✕</span>
                  ) : <span className="text-sm text-gray-500">{String(row.them)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 7: Platform Features Showcase */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-[#111111]/50 to-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">Powerful Platform</h2>
            <p className="text-gray-400 text-sm md:text-lg">Built with modern technology for the best experience</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: Smartphone, title: "Mobile First", desc: "Fully responsive on all devices" },
              { icon: Eye, title: "File Preview", desc: "Preview images, videos, audio, PDFs" },
              { icon: HardDrive, title: "No Limits", desc: "Files up to 5GB, no compression" },
              { icon: Globe, title: "Global CDN", desc: "Fast delivery worldwide" },
              { icon: Lock, title: "Privacy", desc: "Password & expiry controls" },
              { icon: Zap, title: "Fast Upload", desc: "Multipart parallel uploads" },
              { icon: Share2, title: "Short URLs", desc: "Clean fii.one/s/... links" },
              { icon: Clock, title: "24/7 Access", desc: "Always available, 99.9% uptime" },
            ].map((item) => (
              <div key={item.title} className="bg-[#111111] border border-gray-800 rounded-xl p-4 md:p-6 hover:border-violet-500/30 transition-colors">
                <item.icon className="w-6 h-6 text-violet-400 mb-3" />
                <h3 className="text-sm md:text-base font-semibold mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12 md:py-20 px-4">

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold mb-2">Simple Pricing</h2>
            <p className="text-gray-400 text-sm md:text-lg">Start free, upgrade when you need more</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-4 md:p-8 rounded-xl md:rounded-2xl border ${
                  plan.popular
                    ? "bg-gradient-to-b from-violet-500/10 to-purple-500/5 border-violet-500/50"
                    : "bg-[#111111] border-gray-800"
                }`}
              >
                {plan.popular && (
                  <span className="inline-block px-2.5 py-0.5 md:px-3 md:py-1 bg-violet-500 text-white text-xs md:text-sm font-semibold rounded-full mb-3 md:mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl md:text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4 md:mb-6">
                  <span className="text-3xl md:text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 md:gap-3 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="/register"
                  className={`block text-center px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-medium md:font-semibold transition-colors ${
                    plan.popular
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 text-sm md:text-lg mb-6 md:mb-8">
            Join thousands of users who trust fii.one.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm md:text-base font-semibold rounded-xl transition-all btn-press hover:shadow-lg hover:shadow-violet-500/25"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
