import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Code, Upload, FileText, Trash2, Key, ArrowRight, Copy } from "lucide-react";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Code className="w-4 h-4" />
            REST API v1
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            fii.one API
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Upload, manage, and share files programmatically. Integrate fii.one into your apps, websites, and workflows.
          </p>
          <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors btn-press">
            Get Your API Key <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Quick Start</h2>
          
          <div className="space-y-8">
            {/* Step 1 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-violet-500/20 rounded-full flex items-center justify-center text-sm text-violet-400 font-bold">1</span>
                Get your API key
              </h3>
              <p className="text-gray-400 mb-3">Sign in to your fii.one account and generate an API key from <a href="/settings" className="text-violet-400 hover:underline">Settings → API Keys</a>.</p>
            </div>

            {/* Step 2 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-violet-500/20 rounded-full flex items-center justify-center text-sm text-violet-400 font-bold">2</span>
                Upload your first file
              </h3>
              <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <span className="text-xs text-gray-500 font-mono">cURL</span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono">
{`curl -X POST "https://fii.one/api/v1/upload" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "image=@/path/to/file.jpg" \\
  -F "name=my-image.jpg"`}
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-violet-500/20 rounded-full flex items-center justify-center text-sm text-violet-400 font-bold">3</span>
                Get the response
              </h3>
              <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <span className="text-xs text-gray-500 font-mono">JSON Response</span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono">
{`{
  "success": true,
  "data": {
    "id": "abc123-uuid",
    "title": "my-image.jpg",
    "url": "https://cdn.fii.one/user/file.jpg",
    "direct_link": "https://cdn.fii.one/user/file.jpg",
    "share_url": "https://fii.one/s/aB3xKp",
    "size": 245760,
    "mime": "image/jpeg",
    "created_at": "2026-05-03T10:00:00.000Z"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-16 px-6 bg-[#111111]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">API Endpoints</h2>
          
          <div className="space-y-6">
            {/* Upload */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded font-mono">POST</span>
                <code className="text-sm font-mono text-gray-300">/api/v1/upload</code>
              </div>
              <p className="text-gray-400 text-sm mb-4">Upload a file. Accepts multipart/form-data or JSON with base64.</p>
              <h4 className="text-sm font-semibold mb-2">Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">image</code><span className="text-gray-400">Required. File binary or base64 data.</span></div>
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">name</code><span className="text-gray-400">Optional. Custom filename.</span></div>
              </div>
            </div>

            {/* List Files */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded font-mono">GET</span>
                <code className="text-sm font-mono text-gray-300">/api/v1/files</code>
              </div>
              <p className="text-gray-400 text-sm mb-4">List all your files with pagination.</p>
              <h4 className="text-sm font-semibold mb-2">Query Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">page</code><span className="text-gray-400">Page number (default: 1)</span></div>
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">limit</code><span className="text-gray-400">Results per page (default: 50, max: 100)</span></div>
              </div>
            </div>

            {/* Get File */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded font-mono">GET</span>
                <code className="text-sm font-mono text-gray-300">/api/v1/files/:id</code>
              </div>
              <p className="text-gray-400 text-sm">Get detailed information about a specific file.</p>
            </div>

            {/* Update File */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded font-mono">PATCH</span>
                <code className="text-sm font-mono text-gray-300">/api/v1/files/:id</code>
              </div>
              <p className="text-gray-400 text-sm mb-4">Update file metadata (rename, move to folder).</p>
              <h4 className="text-sm font-semibold mb-2">Body (JSON)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">name</code><span className="text-gray-400">New filename</span></div>
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">folder_id</code><span className="text-gray-400">Move to folder (null for root)</span></div>
              </div>
            </div>

            {/* Delete File */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded font-mono">DELETE</span>
                <code className="text-sm font-mono text-gray-300">/api/v1/files/:id</code>
              </div>
              <p className="text-gray-400 text-sm">Permanently delete a file and its share links.</p>
            </div>

            {/* API Keys Management */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded font-mono">POST</span>
                <code className="text-sm font-mono text-gray-300">/api/v1/keys</code>
              </div>
              <p className="text-gray-400 text-sm mb-4">Create a new API key (requires session auth).</p>
              <h4 className="text-sm font-semibold mb-2">Body (JSON)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">name</code><span className="text-gray-400">Required. Key label (e.g., "My App")</span></div>
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">permissions</code><span className="text-gray-400">Array: ["upload", "read", "delete"]</span></div>
                <div className="flex gap-4"><code className="text-violet-400 w-24 shrink-0">expires_in_days</code><span className="text-gray-400">Optional. Days until expiry.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Authentication</h2>
          <p className="text-gray-400 mb-6">All API requests require an API key. Include it in the <code className="text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">Authorization</code> header:</p>
          <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden mb-8">
            <pre className="p-4 text-sm text-gray-300 font-mono">
{`Authorization: Bearer fii_your_api_key_here`}
            </pre>
          </div>
          <p className="text-gray-400">Alternatively, pass as query parameter: <code className="text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">?key=fii_your_api_key_here</code></p>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-16 px-6 bg-[#111111]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Code Examples</h2>
          
          <div className="space-y-6">
            {/* JavaScript */}
            <div>
              <h3 className="text-lg font-semibold mb-3">JavaScript / Node.js</h3>
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <span className="text-xs text-gray-500 font-mono">upload.js</span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono">
{`const form = new FormData();
form.append('image', fileInput.files[0]);

const res = await fetch('https://fii.one/api/v1/upload', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  body: form,
});

const data = await res.json();
console.log(data.data.direct_link);`}
                </pre>
              </div>
            </div>

            {/* Python */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Python</h3>
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <span className="text-xs text-gray-500 font-mono">upload.py</span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono">
{`import requests

url = "https://fii.one/api/v1/upload"
headers = {"Authorization": "Bearer YOUR_API_KEY"}
files = {"image": open("photo.jpg", "rb")}

response = requests.post(url, headers=headers, files=files)
data = response.json()
print(data["data"]["direct_link"])`}
                </pre>
              </div>
            </div>

            {/* PHP */}
            <div>
              <h3 className="text-lg font-semibold mb-3">PHP</h3>
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <span className="text-xs text-gray-500 font-mono">upload.php</span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono">
{`$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://fii.one/api/v1/upload");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Authorization: Bearer YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
  "image" => new CURLFile("/path/to/file.jpg")
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = json_decode(curl_exec($ch));
echo $response->data->direct_link;`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Rate Limits & Quotas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold mb-2">Free Plan</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• 100 API requests / hour</li>
                <li>• 200 MB max file size</li>
                <li>• 5 GB total storage</li>
                <li>• 10 GB bandwidth / month</li>
              </ul>
            </div>
            <div className="bg-[#111111] border border-violet-500/30 rounded-xl p-6">
              <h3 className="font-semibold mb-2 text-violet-400">Pro Plan</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• 1,000 API requests / hour</li>
                <li>• 2 GB max file size</li>
                <li>• 100 GB total storage</li>
                <li>• 500 GB bandwidth / month</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="py-16 px-6 bg-[#111111]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Error Codes</h2>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-800 text-sm font-semibold text-gray-400">
              <span>Code</span><span>Status</span><span>Description</span>
            </div>
            {[
              { code: "400", status: "Bad Request", desc: "Missing or invalid parameters" },
              { code: "401", status: "Unauthorized", desc: "Invalid or missing API key" },
              { code: "403", status: "Forbidden", desc: "Insufficient permissions" },
              { code: "404", status: "Not Found", desc: "File or resource not found" },
              { code: "413", status: "Too Large", desc: "File exceeds plan size limit" },
              { code: "429", status: "Rate Limited", desc: "Too many requests" },
              { code: "500", status: "Server Error", desc: "Internal server error" },
            ].map((err) => (
              <div key={err.code} className="grid grid-cols-3 gap-4 p-4 border-b border-gray-800/50 text-sm">
                <code className="text-red-400">{err.code}</code>
                <span className="text-gray-300">{err.status}</span>
                <span className="text-gray-400">{err.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
