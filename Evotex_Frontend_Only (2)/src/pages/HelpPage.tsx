import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import VoterLayout from '../components/VoterLayout';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const faqs = [
    { q: 'How do I register to vote?', a: 'Visit the registration page, enter your details, and verify your email. Administrators will approve your account before you can vote.' },
    { q: 'What if I forgot my password?', a: 'Use the "Forgot Password" option on the login page to reset it via your registered email.' },
    { q: 'Can I vote multiple times in one election?', a: 'No, the system is designed to allow only one vote per person per election.' },
    { q: 'Is biometric voting secure?', a: 'Yes, biometric voting uses encrypted FIDO2/WebAuthn technology for secure authentication.' },
    { q: 'How can I view election results?', a: 'Results are available after the election ends. Visit the Results page to see live vote counts and analysis.' },
    { q: 'What should I do if I experience technical issues?', a: 'Contact support using the form below with details about your issue, and we will help you as soon as possible.' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const token = localStorage.getItem('evotex_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/support/ticket`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });

      const data = await response.json().catch(() => ({} as { message?: string }));

      if (response.status === 201) {
        setResult({ type: 'success', message: 'Message sent successfully' });
        setForm({ name: '', email: '', subject: '', message: '' });
        return;
      }

      setResult({
        type: 'error',
        message: data.message || `Failed to send message (${response.status})`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      setResult({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VoterLayout title="Help & Support">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Help & Support</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Find answers to your questions or contact our support team</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-colors text-sm ${
            activeTab === 'faq' ? 'bg-[#16a34a] text-white' : 'bg-white border border-[#bbf7d0] text-gray-700 hover:bg-[#f0fdf4]'
          }`}
        >
          FAQ
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-colors text-sm ${
            activeTab === 'contact' ? 'bg-[#16a34a] text-white' : 'bg-white border border-[#bbf7d0] text-gray-700 hover:bg-[#f0fdf4]'
          }`}
        >
          Contact Support
        </button>
      </div>

      {activeTab === 'faq' ? (
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <details key={idx} className="bg-white rounded-2xl border border-[#bbf7d0] shadow-sm p-4 hover:shadow-md transition-shadow group">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-[#16a34a]">→</span>
                {faq.q}
              </summary>
              <p className="text-[#6b7280] text-sm mt-3 ml-6">{faq.a}</p>
            </details>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl">
          <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-6">
            {result && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                result.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {result.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p className="text-sm">{result.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Your full name"
                  className="border border-[#bbf7d0] rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="your@email.com"
                  className="border border-[#bbf7d0] rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  required
                  placeholder="How can we help?"
                  className="border border-[#bbf7d0] rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Describe your issue or question in detail..."
                  className="border border-[#bbf7d0] rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4" /> Send Message</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </VoterLayout>
  );
}
