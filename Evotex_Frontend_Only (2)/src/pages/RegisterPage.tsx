import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, CreditCard } from 'lucide-react';
import api from '../api';
import { isValidCnic } from '../utils/cnic';
import AuthCard from '../components/ui/AuthCard';
import { FormField, IconInput } from '../components/ui/FormField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', cnic: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!isValidCnic(form.cnic)) e.cnic = 'Enter a valid CNIC (e.g. 12345-1234567-1).';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendError('');
    const e2 = validate();
    setErrors(e2);
    if (Object.keys(e2).length === 0) {
      setLoading(true);
      try {
        await api.post('/auth/register', {
          name: form.name,
          email: form.email,
          cnic: form.cnic,
          password: form.password,
        });
        setSuccess(true);
        setTimeout(() => navigate('/login'), 1800);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setBackendError(msg || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AuthCard
      title="Register as Voter"
      subtitle="Create your secure voter account"
      alert={
        <>
          {success && (
            <div className="flex items-center gap-3 bg-evotex-mint border border-evotex-mint-border rounded-xl px-4 py-3 mb-6">
              <CheckCircle className="w-5 h-5 text-evotex-primary shrink-0" />
              <p className="text-green-800 text-sm font-medium">Account created! Redirecting...</p>
            </div>
          )}
          {backendError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-700 text-sm">{backendError}</div>
          )}
        </>
      }
      footer={
        <p className="text-center text-sm text-evotex-muted mt-6">
          Already have an account? <Link to="/login" className="text-evotex-primary font-semibold hover:underline">Login here</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Full Name" error={errors.name}>
          <IconInput type="text" value={form.name} onChange={e => set('name', e.target.value)} icon={<User className="w-4 h-4" />} />
        </FormField>
        <FormField label="Email Address" error={errors.email}>
          <IconInput type="email" value={form.email} onChange={e => set('email', e.target.value)} icon={<Mail className="w-4 h-4" />} />
        </FormField>
        <FormField label="CNIC" error={errors.cnic}>
          <IconInput type="text" value={form.cnic} onChange={e => set('cnic', e.target.value)} placeholder="12345-1234567-1" icon={<CreditCard className="w-4 h-4" />} />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <IconInput
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={e => set('password', e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            right={
              <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
        </FormField>
        <FormField label="Confirm Password" error={errors.confirm}>
          <IconInput
            type={showConfirm ? 'text' : 'password'}
            value={form.confirm}
            onChange={e => set('confirm', e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            right={
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
        </FormField>
        <button type="submit" disabled={loading} className="w-full evotex-btn-primary mt-2">
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </AuthCard>
  );
}
