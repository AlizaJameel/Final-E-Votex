import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, Mail } from 'lucide-react';
import api, { setAuthToken } from '../api';
import AuthCard from '../components/ui/AuthCard';
import { FormField, IconInput } from '../components/ui/FormField';

export default function LoginPage() {
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
      const response = await api.post('/auth/login', { email, password });
      setAuthToken(response.data.token, response.data.role, response.data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Voter Login"
      subtitle="Access your voting dashboard"
      alert={
        error ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        ) : null
      }
      footer={
        <p className="text-center text-sm text-evotex-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-evotex-primary font-semibold hover:underline">Register here</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email Address">
          <IconInput type="email" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail className="w-4 h-4" />} />
        </FormField>

        <FormField
          label="Password"
          labelRight={
            <Link to="/help" className="text-sm text-evotex-primary hover:underline font-medium">Forgot Password?</Link>
          }
        >
          <IconInput
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
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
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </AuthCard>
  );
}
