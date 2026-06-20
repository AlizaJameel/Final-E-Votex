import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Zap, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';

const features = [
  { icon: Lock, title: 'Secure', desc: 'AES-256 encryption and FIDO2 biometric authentication protect every vote.' },
  { icon: Eye, title: 'Transparent', desc: 'Real-time results and public audit logs ensure complete transparency.' },
  { icon: Zap, title: 'Fast', desc: 'Cast your vote in seconds with seamless biometric verification.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="max-w-page mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <div className="flex-1 max-w-xl w-full">
          <span className="inline-flex items-center gap-2 bg-evotex-mint text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-evotex-mint-border">
            <Shield className="w-3.5 h-3.5" /> Pakistan&apos;s Trusted Platform
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 font-display">
            Your Vote,<br />
            <span className="text-evotex-primary">Your Voice</span>
          </h1>
          <p className="text-lg text-evotex-muted mb-10 leading-relaxed">
            Pakistan&apos;s Secure Digital Voting Platform. FIDO2 biometric authentication and AES-256 encryption ensure every vote is tamper-proof and anonymous.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/register" className="evotex-btn-primary px-7 py-3.5 shadow-md">
              Register
            </Link>
            <Link to="/login" className="evotex-btn-outline px-7 py-3.5">
              Login
            </Link>
            <a href="#features" className="evotex-btn-outline px-7 py-3.5 flex items-center gap-2">
              Learn More <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex-1 flex justify-center w-full">
          <svg viewBox="0 0 480 400" className="w-full max-w-md" fill="none" aria-hidden>
            <rect x="100" y="120" width="280" height="220" rx="20" fill="#ecfdf5" stroke="#bbf7d0" strokeWidth="2" />
            <rect x="130" y="80" width="220" height="60" rx="10" fill="#ecfdf5" stroke="#bbf7d0" strokeWidth="1.5" />
            <text x="240" y="117" textAnchor="middle" fill="#16a34a" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">BALLOT</text>
            <rect x="145" y="165" width="190" height="38" rx="8" fill="white" stroke="#bbf7d0" strokeWidth="1.5" />
            <circle cx="165" cy="184" r="8" fill="#16a34a" />
            <text x="183" y="189" fill="#374151" fontSize="12">Candidate A</text>
            <rect x="145" y="213" width="190" height="38" rx="8" fill="white" stroke="#bbf7d0" strokeWidth="1.5" />
            <circle cx="165" cy="232" r="8" fill="#E5E7EB" stroke="#bbf7d0" strokeWidth="1.5" />
            <text x="183" y="237" fill="#374151" fontSize="12">Candidate B</text>
            <rect x="145" y="261" width="190" height="38" rx="8" fill="white" stroke="#bbf7d0" strokeWidth="1.5" />
            <circle cx="165" cy="280" r="8" fill="#E5E7EB" stroke="#bbf7d0" strokeWidth="1.5" />
            <text x="183" y="285" fill="#374151" fontSize="12">Candidate C</text>
            <rect x="175" y="318" width="130" height="34" rx="8" fill="#16a34a" />
            <text x="240" y="340" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Cast Vote</text>
            <circle cx="94" cy="114" r="24" fill="#16a34a" />
            <rect x="84" y="112" width="20" height="14" rx="3" fill="white" />
            <circle cx="386" cy="114" r="24" fill="#22c55e" />
          </svg>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 bg-white border-t border-gray-100">
        <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-display">Why E-Votex?</h2>
            <p className="text-evotex-muted max-w-xl mx-auto">Every component is engineered to protect your vote from submission to result.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-evotex-mint rounded-2xl border border-evotex-mint-border p-8 hover:shadow-md transition-shadow">
                  <div className="bg-white w-14 h-14 rounded-xl flex items-center justify-center mb-5 border border-evotex-mint-border">
                    <Icon className="w-7 h-7 text-evotex-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-evotex-muted leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-evotex-sidebar text-white py-12">
        <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-evotex-primary p-1.5 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-display">E-Votex</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-green-200">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/help" className="hover:text-white transition-colors">Help</Link>
              <Link to="/admin/login" className="hover:text-white transition-colors">Admin Login</Link>
            </div>
          </div>
          <div className="border-t border-green-800 pt-6 text-center text-sm text-green-300">
            &copy; 2026 E-Votex. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
