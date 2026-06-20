import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

type EvotexLogoProps = {
  to?: string;
  variant?: 'light' | 'dark';
  showText?: boolean;
  className?: string;
};

export default function EvotexLogo({ to = '/', variant = 'dark', showText = true, className = '' }: EvotexLogoProps) {
  const textClass = variant === 'light' ? 'text-white' : 'text-gray-900';
  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="bg-evotex-primary p-1.5 rounded-lg shrink-0">
        <Shield className="w-5 h-5 text-white" strokeWidth={2.25} />
      </span>
      {showText && <span className={`text-xl font-bold font-display ${textClass}`}>E-Votex</span>}
    </span>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
