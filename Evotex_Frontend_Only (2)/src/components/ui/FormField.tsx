import { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  labelRight?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, labelRight, error, children }: FormFieldProps) {
  return (
    <div>
      <div className={`flex items-center mb-1.5 ${labelRight ? 'justify-between' : ''}`}>
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        {labelRight}
      </div>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

type IconInputProps = {
  icon: ReactNode;
  right?: ReactNode;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function IconInput({ icon, right, className = '', ...props }: IconInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
      <input {...props} className={`evotex-input pl-10 ${right ? 'pr-11' : ''} ${className}`} />
      {right && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</span>}
    </div>
  );
}
