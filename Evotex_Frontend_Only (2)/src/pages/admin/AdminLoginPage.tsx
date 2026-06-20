import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, AlertTriangle } from 'lucide-react';
import api, { setAuthToken } from '../../api';
import AuthCard from '../../components/ui/AuthCard';
import { FormField, IconInput } from '../../components/ui/FormField';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/admin/login', { email, password });
      setAuthToken(response.data.token, response.data.role);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Admin Login"
      subtitle="Election management access"
      alert={
        <>
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 text-xs font-semibold">Admin Access Only — Unauthorized access is prohibited</p>
          </div>
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
        </>
      }
      footer={
        <p className="text-center text-sm text-evotex-muted mt-4">
          <Link to="/" className="text-evotex-primary font-semibold hover:underline">Back to Home</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email">
          <IconInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter admin email" required icon={<Mail className="w-4 h-4" />} />
        </FormField>
        <FormField label="Password">
          <IconInput
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            icon={<Lock className="w-4 h-4" />}
            right={
              <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
        </FormField>
        <button type="submit" disabled={loading} className="w-full evotex-btn-primary mt-2">
          {loading ? 'Logging in...' : 'Admin Login'}
        </button>
        <div className="h-2 bg-evotex-mint rounded-full mt-4" aria-hidden />
      </form>
    </AuthCard>
  );
}
