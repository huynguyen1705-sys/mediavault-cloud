import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-12">Last updated: May 3, 2026</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Information We Collect</h2>
            <p className="text-gray-400 leading-relaxed mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li><strong className="text-gray-300">Account Information:</strong> Email address, display name, and profile picture when you create an account</li>
              <li><strong className="text-gray-300">File Data:</strong> Files you upload, including metadata (file name, size, type, upload date)</li>
              <li><strong className="text-gray-300">Usage Data:</strong> How you interact with our Service, including pages visited and features used</li>
              <li><strong className="text-gray-300">Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong className="text-gray-300">Log Data:</strong> IP addresses, access times, and referring URLs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. How We Use Your Information</h2>
            <p className="text-gray-400 leading-relaxed mb-3">We use collected information to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process uploads, downloads, and file sharing</li>
              <li>Send service-related notifications and updates</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Comply with legal obligations</li>
              <li>Analyze usage patterns to improve user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Data Storage and Security</h2>
            <p className="text-gray-400 leading-relaxed">
              Your files are stored on Cloudflare R2 infrastructure with enterprise-grade security. 
              All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We implement strict 
              access controls and regularly audit our security practices. Our servers are located in 
              multiple regions to ensure redundancy and fast access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Sharing</h2>
            <p className="text-gray-400 leading-relaxed mb-3">
              We do not sell, rent, or trade your personal information. We may share data only in these cases:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li><strong className="text-gray-300">With your consent:</strong> When you explicitly share files via share links</li>
              <li><strong className="text-gray-300">Service providers:</strong> Trusted third parties that help us operate (authentication, payment processing)</li>
              <li><strong className="text-gray-300">Legal requirements:</strong> When required by law, court order, or government request</li>
              <li><strong className="text-gray-300">Safety:</strong> To protect the rights, property, or safety of our users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Your Rights</h2>
            <p className="text-gray-400 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Access and download all your stored data</li>
              <li>Correct inaccurate personal information</li>
              <li>Delete your account and all associated data</li>
              <li>Export your files at any time</li>
              <li>Opt out of non-essential communications</li>
              <li>Request information about data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Cookies and Tracking</h2>
            <p className="text-gray-400 leading-relaxed">
              We use essential cookies for authentication and session management. We do not use 
              third-party advertising trackers. Analytics data is collected anonymously to improve 
              the Service. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Data Retention</h2>
            <p className="text-gray-400 leading-relaxed">
              We retain your data as long as your account is active. Files from deleted accounts are 
              permanently removed within 30 days. Backup copies may persist for up to 90 days for 
              disaster recovery purposes. Log data is retained for 12 months for security analysis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Children's Privacy</h2>
            <p className="text-gray-400 leading-relaxed">
              fii.one is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children. If we discover that a child has provided us with 
              personal information, we will delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. International Transfers</h2>
            <p className="text-gray-400 leading-relaxed">
              Your data may be stored and processed in various countries where our infrastructure is 
              located. By using the Service, you consent to the transfer of your data to these locations. 
              We ensure appropriate safeguards are in place for international data transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Changes to This Policy</h2>
            <p className="text-gray-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes via email or in-app notification. Your continued use of the Service after changes 
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">11. Contact Us</h2>
            <p className="text-gray-400 leading-relaxed">
              For privacy-related questions or requests, contact us at{" "}
              <a href="mailto:privacy@fii.one" className="text-violet-400 hover:text-violet-300">privacy@fii.one</a>.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
