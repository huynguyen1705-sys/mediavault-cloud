import Link from "next/link";
import Navbar from "@/components/layout/navbar";
import HomeUpload from "@/components/HomeUpload";
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
      features: ["1 GB Storage", "100 MB max file size", "7 day file retention", "Basic sharing"],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$9",
      period: "/month",
      features: ["50 GB Storage", "5 GB max file size", "Permanent storage", "Advanced sharing", "Priority support", "No ads"],
      cta: "Start Free Trial",
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
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
            <Link
              href="/register"
              className="px-4 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm md:text-base font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-2.5 md:px-6 md:py-3 bg-gray-800 hover:bg-gray-700 text-white text-sm md:text-base font-medium rounded-lg transition-all"
            >
              View Pricing
            </Link>
          </div>

          {/* Upload Component */}
          <HomeUpload />

          {/* Mock Preview - Hide on small mobile */}
          <div className="mt-10 md:mt-16 relative hidden sm:block">
            <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl p-1">
              <div className="bg-gray-900 rounded-xl p-4 md:p-6">
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
      <section className="py-12 md:py-20 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold mb-2">Everything You Need</h2>
            <p className="text-gray-400 text-sm md:text-lg">Professional media storage</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-4 md:p-6 bg-gray-900 border border-gray-800 rounded-xl md:rounded-2xl hover:border-violet-500/50 transition-colors"
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
                    : "bg-gray-900 border-gray-800"
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
                <Link
                  href="/register"
                  className={`block text-center px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-medium md:font-semibold transition-colors ${
                    plan.popular
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
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
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm md:text-base font-semibold rounded-xl transition-all"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-violet-400" />
            <span className="font-semibold">fii.one</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 fii.one. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
