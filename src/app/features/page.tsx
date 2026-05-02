"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Zap,
  Download,
  Share2,
  FolderOpen,
  Image,
  Video,
  Music,
  Lock,
  Globe,
  Clock,
  HardDrive,
  Layers,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: HardDrive,
    title: "Unlimited Cloud Storage",
    description: "Store all your media files securely in the cloud with automatic backups",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Image,
    title: "Image Support",
    description: "Upload and preview images in all popular formats including HEIC, WebP, and RAW",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Video,
    title: "Video Hosting",
    description: "Store and stream videos with optimized playback and custom thumbnails",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Music,
    title: "Audio Files",
    description: "Upload music, podcasts, and audio recordings with built-in player",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: FolderOpen,
    title: "Folder Organization",
    description: "Organize files into folders and subfolders with drag-and-drop interface",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Share2,
    title: "Advanced Sharing",
    description: "Share files with password protection, expiration dates, and download limits",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Globe,
    title: "Public Galleries",
    description: "Create public portfolios with customizable embed codes for websites",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "Your files are encrypted at rest and in transit with military-grade encryption",
    color: "from-red-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Upload and download speeds optimized for large media files",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Clock,
    title: "Automatic Cleanup",
    description: "Files auto-expire after set period, keeping your storage organized",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Layers,
    title: "File Versioning",
    description: "Track changes and restore previous versions of your files",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access and manage files from any device with our responsive interface",
    color: "from-teal-500 to-cyan-500",
  },
];

const techStack = [
  { name: "Next.js", desc: "Modern React framework" },
  { name: "Cloudflare R2", desc: "Enterprise storage" },
  { name: "Clerk Auth", desc: "Secure authentication" },
  { name: "PostgreSQL", desc: "Reliable database" },
  { name: "Edge Network", desc: "Global CDN" },
  { name: "AES-256", desc: "Encryption" },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-20">
      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-violet-500/20 text-violet-300 border border-violet-500/30 px-4 py-1 rounded-full mb-6">
              <Zap className="w-3 h-3" />
              <span className="text-sm">Packed with Features</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Everything You Need to Manage Media
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              fii.one combines powerful storage, beautiful previews, and seamless sharing
              in one platform designed for creators and teams.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <div className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors rounded-2xl p-6 h-full">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Built With Modern Tech</h2>
          <p className="text-gray-400 mb-12">
            Enterprise-grade infrastructure for reliability and speed
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="p-4 bg-gray-900 border border-gray-800 rounded-xl"
              >
                <div className="font-semibold mb-1">{tech.name}</div>
                <div className="text-xs text-gray-500">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8">
            Join thousands of creators who trust fii.one for their media storage
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
