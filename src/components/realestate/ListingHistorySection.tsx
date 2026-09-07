import React from 'react';
import { History, TrendingDown, Calendar, Tag, FileText, CheckCircle2, ArrowDownRight } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

export interface HistoryEvent {
  date: string;
  type: 'created' | 'price_change' | 'updated' | 'verified';
  label: string;
  details?: string;
  oldPrice?: number;
  newPrice?: number;
}

interface ListingHistorySectionProps {
  daysAgo?: number; // e.g. 12
  priceChangePercent?: number; // e.g. -5
  originalPrice?: number; // e.g. 36800000
  currentPrice?: number; // e.g. 34900000
  historyEvents?: HistoryEvent[];
  className?: string;
}

const DEFAULT_HISTORY_EVENTS: HistoryEvent[] = [
  { date: '2026. augusztus 23.', type: 'created', label: 'Hirdetés feltöltve', details: 'Kezdő ár: 36 800 000 Ft' },
  { date: '2026. augusztus 28.', type: 'updated', label: 'Fotók és leírás frissítve', details: 'Alapterület igazolva' },
  { date: '2026. szeptember 01.', type: 'price_change', label: 'Árcsökkenés', oldPrice: 36800000, newPrice: 34900000, details: '-1 900 000 Ft (-5%)' },
  { date: '2026. szeptember 03.', type: 'verified', label: 'ILOLIT VERIFIED tulajdonjog ellenőrizve', details: 'Személyazonosság és ingatlannyilvántartás rendben' },
];

export const ListingHistorySection: React.FC<ListingHistorySectionProps> = ({
  daysAgo = 12,
  priceChangePercent = -5,
  originalPrice = 36800000,
  currentPrice = 34900000,
  historyEvents = DEFAULT_HISTORY_EVENTS,
  className = '',
}) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <History size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-100">Hirdetés Történet & Árváltozás</h3>
            <p className="text-xs text-slate-400">Transzparens idővonal a megalapozott döntéshez</p>
          </div>
        </div>

        {/* Quick Badges (IV.17 Requirements) */}
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-400" />
            <span>Feltöltve: {daysAgo} napja</span>
          </Badge>

          {priceChangePercent !== 0 && (
            <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-xs font-black px-3 py-1 flex items-center gap-1">
              <TrendingDown size={14} className="text-rose-400" />
              <span>Árváltozás: {priceChangePercent}%</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline Events */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {historyEvents.map((event, idx) => (
          <div key={idx} className="relative flex items-start gap-3 text-xs">
            {/* Timeline Dot */}
            <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              event.type === 'price_change'
                ? 'bg-rose-500 ring-2 ring-rose-900/60'
                : event.type === 'verified'
                ? 'bg-emerald-400 ring-2 ring-emerald-900/60'
                : 'bg-indigo-500'
            }`} />

            <div className="flex-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-200 text-xs">{event.label}</span>
                <span className="text-[10px] font-bold text-slate-400">{event.date}</span>
              </div>

              {event.oldPrice && event.newPrice && (
                <div className="flex items-center gap-2 text-xs font-bold pt-1">
                  <span className="line-through text-slate-500">{formatPrice(event.oldPrice)}</span>
                  <ArrowDownRight size={14} className="text-rose-400" />
                  <span className="text-rose-400 font-extrabold">{formatPrice(event.newPrice)}</span>
                </div>
              )}

              {event.details && (
                <p className="text-[11px] text-slate-400 font-medium">{event.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
