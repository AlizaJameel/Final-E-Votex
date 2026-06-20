import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconBg = 'bg-evotex-mint',
  iconColor = 'text-evotex-primary',
}: StatCardProps) {
  return (
    <div className="evotex-card p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">{value}</p>
        <p className="text-xs text-evotex-muted font-medium mt-1">{label}</p>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}
