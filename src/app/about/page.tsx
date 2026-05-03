import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Shield, Zap, Globe, Users, Heart, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            About fii.one
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            We believe everyone deserves fast, secure, and beautiful cloud storage.
            fii.one was built to make file sharing effortless.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                fii.one was created with a simple goal: provide a cloud storage platform that's fast, 
                secure, and easy to use. We're tired of bloated apps with confusing interfaces and 
                hidden fees.
              </p>
              <p className="text-gray-400 leading-relaxed mb-4">
                Our platform is designed for creators, professionals, and teams who need reliable 
                storage with instant file sharing capabilities. Whether you're sharing photos with 
                clients or collaborating on video projects, fii.one handles it seamlessly.
              </p>
              <p className="text-gray-400 leading-relaxed">
                We prioritize privacy and security. Your files are encrypted, stored on enterprise-grade 
                infrastructure, and never accessed by anyone without your permission.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, label: "End-to-end Security", color: "text-green-400 bg-green-500/10" },
                { icon: Zap, label: "Lightning Fast", color: "text-yellow-400 bg-yellow-500/10" },
                { icon: Globe, label: "Global CDN", color: "text-blue-400 bg-blue-500/10" },
                { icon: Users, label: "Built for Teams", color: "text-purple-400 bg-purple-500/10" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-3`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Privacy First",
                description: "Your data belongs to you. We never sell, share, or access your files without explicit permission. Zero-knowledge encryption keeps your content private."
              },
              {
                icon: Heart,
                title: "User Experience",
                description: "Every feature is designed with care. Clean interfaces, fast performance, and intuitive workflows. No bloat, no confusion — just the tools you need."
              },
              {
                icon: Target,
                title: "Reliability",
                description: "Built on enterprise infrastructure with 99.9% uptime. Your files are always available, backed up across multiple regions for redundancy."
              },
            ].map((value) => (
              <div key={value.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                <value.icon className="w-8 h-8 text-violet-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-gray-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "50+", label: "Countries" },
              { value: "256-bit", label: "Encryption" },
              { value: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-violet-400">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
