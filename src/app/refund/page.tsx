import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-gray-500 mb-12">Last updated: May 3, 2026</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Overview</h2>
            <p className="text-gray-400 leading-relaxed">
              At fii.one, we want you to be completely satisfied with our service. If you're not happy 
              with your purchase, we offer a straightforward refund process as outlined below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">30-Day Money-Back Guarantee</h2>
            <p className="text-gray-400 leading-relaxed">
              All paid plans come with a 30-day money-back guarantee. If you're not satisfied with 
              the Service within the first 30 days of your initial purchase, you may request a full 
              refund — no questions asked.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Eligibility for Refund</h2>
            <p className="text-gray-400 leading-relaxed mb-3">You are eligible for a refund if:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Your request is within 30 days of the initial subscription payment</li>
              <li>You are on your first billing cycle (first-time subscribers)</li>
              <li>You have not previously received a refund for the same subscription</li>
              <li>Your account has not been terminated for Terms of Service violations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Non-Refundable Situations</h2>
            <p className="text-gray-400 leading-relaxed mb-3">Refunds are not available for:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Renewal payments (after the first billing cycle)</li>
              <li>Partial month usage — we do not pro-rate refunds</li>
              <li>Accounts terminated due to Terms of Service violations</li>
              <li>Add-on purchases or one-time fees (if applicable)</li>
              <li>Requests made after 30 days from the initial purchase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">How to Request a Refund</h2>
            <p className="text-gray-400 leading-relaxed mb-3">To request a refund:</p>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>Email us at <a href="mailto:support@fii.one" className="text-violet-400 hover:text-violet-300">support@fii.one</a> with subject "Refund Request"</li>
              <li>Include your account email and the reason for your request</li>
              <li>We will process your refund within 5-10 business days</li>
              <li>The refund will be credited to your original payment method</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Processing Time</h2>
            <p className="text-gray-400 leading-relaxed">
              Once approved, refunds are typically processed within 5-10 business days. Depending on 
              your bank or payment provider, it may take an additional 3-5 business days to appear 
              on your statement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Account After Refund</h2>
            <p className="text-gray-400 leading-relaxed">
              After a refund is processed, your account will be downgraded to the Free plan. Your 
              files will be retained for 30 days. If your stored data exceeds the Free plan limit 
              (1GB), you will need to delete files or upgrade again to maintain access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Cancellation vs. Refund</h2>
            <p className="text-gray-400 leading-relaxed">
              Cancelling your subscription is different from requesting a refund. When you cancel, 
              you retain access until the end of your current billing period. A refund returns your 
              payment and immediately downgrades your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Disputes</h2>
            <p className="text-gray-400 leading-relaxed">
              If you believe you were charged incorrectly, please contact us before filing a dispute 
              with your bank. We're committed to resolving billing issues quickly and fairly. 
              Chargebacks filed without prior contact may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Contact</h2>
            <p className="text-gray-400 leading-relaxed">
              For refund requests or billing questions, email us at{" "}
              <a href="mailto:support@fii.one" className="text-violet-400 hover:text-violet-300">support@fii.one</a>.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
