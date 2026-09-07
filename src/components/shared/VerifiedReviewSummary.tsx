import React from 'react';
import { Star, ShieldCheck, ShoppingBag, Calendar, Wrench, GraduationCap } from 'lucide-react';

export type TransactionReviewType = 'vásárlás' | 'foglalás' | 'szolgáltatás' | 'képzés';

interface VerifiedReviewSummaryProps {
  rating: number; // e.g. 4.9
  reviewCount: number; // e.g. 127
  transactionType?: TransactionReviewType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerifiedReviewSummary: React.FC<VerifiedReviewSummaryProps> = ({
  rating,
  reviewCount,
  transactionType,
  size = 'md',
  className = '',
}) => {
  const formattedRating = rating.toFixed(1).replace('.', ',');

  const typeIcons: Record<TransactionReviewType, React.ElementType> = {
    vásárlás: ShoppingBag,
    foglalás: Calendar,
    szolgáltatás: Wrench,
    képzés: GraduationCap,
  };

  const TypeIcon = transactionType ? typeIcons[transactionType] : ShieldCheck;

  const sizeClasses = {
    sm: 'text-xs gap-1.5',
    md: 'text-sm gap-2',
    lg: 'text-base gap-2.5',
  };

  const starSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <div className={`inline-flex items-center flex-wrap ${sizeClasses[size]} ${className}`}>
      {/* Rating badge */}
      <div className="flex items-center font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg shadow-sm">
        <Star size={starSizes[size]} className="fill-amber-400 text-amber-400 mr-1" />
        <span>{formattedRating}</span>
      </div>

      {/* Verified count label */}
      <div className="flex items-center font-medium text-slate-300 bg-slate-800/80 border border-slate-700/60 px-2.5 py-0.5 rounded-lg">
        <ShieldCheck size={starSizes[size] - 2} className="text-emerald-400 mr-1.5" />
        <span className="font-semibold text-slate-100">{reviewCount}</span>
        <span className="ml-1 text-slate-400">ellenőrzött értékelés</span>
      </div>

      {/* Optional Transaction Type Tag */}
      {transactionType && (
        <div className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md">
          <TypeIcon size={13} className="mr-1" />
          <span>Valódi {transactionType} alapján</span>
        </div>
      )}
    </div>
  );
};
