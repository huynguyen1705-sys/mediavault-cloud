"use client";

import { useState } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import {
  Check,
  X,
  Zap,
  Crown,
  Building,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    price: 0,
    priceLabel: "Free",
    description: "Perfect for getting started with basic file storage.",
    features: [
      { text: "1 GB Storage", included: true },
      { text: "100 MB Max File Size", included: true },
      { text: "5 GB Bandwidth/mo", included: true },
      { text: "7-day file retention", included: true },
      { text: "Basic sharing", included: true },
      { text: "Download enabled", included: true },
      { text: "Embed support", included: false },
      { text: "Priority support", included: false },
      { text: "Custom branding", included: false },
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    price: 9.99,
    priceLabel: "$9.99/mo",
    description: "For power users who need more storage and features.",
    features: [
      { text: "50 GB Storage", included: true },
      { text: "500 MB Max File Size", included: true },
      { text: "100 GB Bandwidth/mo", included: true },
      { text: "Permanent storage", included: true },
      { text: "Advanced sharing & passwords", included: true },
      { text: "Download & embed enabled", included: true },
      { text: "Embed support", included: true },
      { text: "Priority support", included: true },
      { text: "Custom branding", included: false },
    ],
    popular: true,
    cta: "Upgrade to Pro",
  },
  {
    id: "business",
    name: "Business",
    icon: Building,
    price: 29.99,
    priceLabel: "$29.99/mo",
    description: "For teams and businesses with advanced needs.",
    features: [
      { text: "200 GB Storage", included: true },
      { text: "2 GB Max File Size", included: true },
      { text: "500 GB Bandwidth/mo", included: true },
      { text: "Permanent storage", included: true },
      { text: "Advanced sharing & passwords", included: true },
      { text: "Download & embed enabled", included: true },
      { text: "Embed support", included: true },
      { text: "Priority support", included: true },
      { text: "Custom branding", included: true },
    ],
    popular: false,
    cta: "Get Business Plan",
  },
];

const faqs = [
  {
    question: "Can I change my plan later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, the change will take effect at the start of your next billing cycle.",
  },
  {
    question: "What happens to my files if I downgrade?",
    answer: "Your files will remain accessible, but if you exceed the storage limit of your new plan, you won't be able to upload new files until you free up space or upgrade again.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team for a full refund.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. For enterprise customers, we also offer invoice-based billing.",
  },
  {
    question: "How does bandwidth work?",
    answer: "Bandwidth is the amount of data transferred when others view or download your files. Exceeding your monthly bandwidth will temporarily limit sharing until the next month or you can purchase additional bandwidth.",
  },
  {
    question: "Can I embed files on my website?",
    answer: "Pro and Business plans support embedding. You can whitelist your domains to allow your media files to be embedded on your own websites.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    // Simulate payment flow
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // In real implementation, redirect to payment page
    alert(`Payment flow for ${planId} plan - This is a placeholder. In production, connect to Stripe/PayPal.`);
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PublicHeader />
      <div className="bg-gradient-to-b from-violet-950/30 to-gray-950 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include secure storage, file sharing, and easy access.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border transition-all ${
                plan.popular
                  ? "bg-gradient-to-b from-violet-900/40 to-gray-900 border-violet-500/50 shadow-lg shadow-violet-500/10"
                  : "bg-[#111111]/80 border-gray-800 hover:border-gray-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-violet-600 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.popular
                      ? "bg-violet-500/20"
                      : "bg-gray-800"
                  }`}
                >
                  <plan.icon
                    className={`w-6 h-6 ${
                      plan.popular ? "text-violet-400" : "text-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="text-2xl font-bold text-violet-400">
                    {plan.priceLabel}
                  </div>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  plan.popular
                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                    : plan.id === "free"
                    ? "bg-gray-800 hover:bg-gray-700 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                } disabled:opacity-50`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-[#111111]/50 border-t border-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-[#111111]/80 border border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/30 transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-gray-400 text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
          <p className="text-gray-400 mb-6">
            Our team is here to help. Contact us anytime and we'll get back to you as soon as possible.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Get Started Now
          </Link>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}