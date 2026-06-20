import { ReactNode } from 'react';
import { Shield } from 'lucide-react';

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  alert?: ReactNode;
};

export default function AuthCard({ title, subtitle, children, footer, alert }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-evotex-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="h-[5px] bg-evotex-primary" />
          <div className="px-8 py-8">
            <div className="flex flex-col items-center mb-8">
              <div className="bg-evotex-primary p-3 rounded-2xl mb-3">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 text-center">{title}</h1>
              {subtitle && <p className="text-evotex-muted text-sm mt-1 text-center">{subtitle}</p>}
            </div>
            {alert}
            {children}
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
