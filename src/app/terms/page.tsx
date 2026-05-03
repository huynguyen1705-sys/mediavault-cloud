import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-12">Last updated: May 3, 2026</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
            <p className="text-gray-400 leading-relaxed">
              By accessing or using fii.one ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service. These terms apply to all 
              visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Description of Service</h2>
            <p className="text-gray-400 leading-relaxed">
              fii.one provides cloud storage services that allow users to upload, store, manage, and share 
              files including but not limited to images, videos, documents, and other digital content. We 
              reserve the right to modify, suspend, or discontinue any aspect of the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. User Accounts</h2>
            <p className="text-gray-400 leading-relaxed mb-3">
              To use certain features of the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Acceptable Use</h2>
            <p className="text-gray-400 leading-relaxed mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Upload, share, or distribute illegal content</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to the Service or other systems</li>
              <li>Use the Service for spam or unsolicited communications</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Storage and Bandwidth</h2>
            <p className="text-gray-400 leading-relaxed">
              Each account is subject to storage and bandwidth limits based on the selected plan. Free 
              accounts include 1GB storage and 10GB monthly bandwidth. Exceeding these limits may result 
              in temporary restrictions. We reserve the right to delete files from inactive accounts 
              after 90 days of inactivity with prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Content Ownership</h2>
            <p className="text-gray-400 leading-relaxed">
              You retain all rights to content you upload to fii.one. By uploading content, you grant us 
              a limited license to store, process, and display your content solely for the purpose of 
              providing the Service. We do not claim ownership of your content and will not use it for 
              any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Payment and Billing</h2>
            <p className="text-gray-400 leading-relaxed">
              Paid plans are billed monthly or annually as selected. Payments are non-refundable except 
              as outlined in our Refund Policy. We may change pricing with 30 days notice. Failure to 
              pay may result in account downgrade or suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Termination</h2>
            <p className="text-gray-400 leading-relaxed">
              We may terminate or suspend your account at any time for violation of these terms. You may 
              delete your account at any time through the Settings page. Upon termination, your files will 
              be deleted within 30 days unless required by law to retain them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Limitation of Liability</h2>
            <p className="text-gray-400 leading-relaxed">
              fii.one is provided "as is" without warranties of any kind. We are not liable for any 
              indirect, incidental, special, or consequential damages arising from your use of the Service. 
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Changes to Terms</h2>
            <p className="text-gray-400 leading-relaxed">
              We reserve the right to update these terms at any time. Significant changes will be 
              communicated via email or in-app notification. Continued use of the Service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">11. Contact</h2>
            <p className="text-gray-400 leading-relaxed">
              For questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:support@fii.one" className="text-violet-400 hover:text-violet-300">support@fii.one</a>.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
