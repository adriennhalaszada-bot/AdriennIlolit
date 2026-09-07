import React, { useState } from 'react';
import { Calculator, AlertCircle, Info, Landmark, Percent, CalendarClock, Coins, Check } from 'lucide-react';
import { formatPrice } from '@/lib/constants';

interface MortgageCalculatorProps {
  propertyPrice: number; // e.g. 72000000
  className?: string;
}

export const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({
  propertyPrice = 72000000,
  className = '',
}) => {
  const [price, setPrice] = useState<number>(propertyPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(25); // 25% default
  const [loanYears, setLoanYears] = useState<number>(20); // 20 years default
  const [interestRate, setInterestRate] = useState<number>(6.5); // 6.5% THM default

  const downPaymentAmount = Math.round(price * (downPaymentPercent / 100));
  const loanAmount = Math.max(0, price - downPaymentAmount);

  // Mortgage installment formula: M = P * [ r(1+r)^n ] / [ (1+r)^n - 1 ]
  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = loanYears * 12;

  let monthlyInstallment = 0;
  if (loanAmount > 0 && monthlyRate > 0 && totalMonths > 0) {
    monthlyInstallment = Math.round(
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
    );
  }

  const totalRepayment = monthlyInstallment * totalMonths;
  const totalInterest = totalRepayment - loanAmount;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calculator size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-100">Havi Költség & Hitel Kalkulátor</h3>
            <p className="text-xs text-slate-400">Becsült törlesztőrészlet kiszámítása a vételár alapján</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-full">
          THM: {interestRate}% (Becsült)
        </span>
      </div>

      {/* Calculator Form Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Vételár */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex justify-between">
            <span>Ingatlan vételára:</span>
            <span className="font-extrabold text-emerald-400">{formatPrice(price)}</span>
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            step={500000}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-bold focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Önerő % */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex justify-between">
            <span>Önerő ({downPaymentPercent}%):</span>
            <span className="font-extrabold text-amber-400">{formatPrice(downPaymentAmount)}</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {downPaymentPercent}%
            </span>
          </div>
        </div>

        {/* Futamidő (évek) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex justify-between">
            <span>Futamidő:</span>
            <span className="font-extrabold text-amber-400">{loanYears} év ({totalMonths} hónap)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={loanYears}
              onChange={(e) => setLoanYears(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {loanYears} év
            </span>
          </div>
        </div>

        {/* Kamatláb / THM % */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex justify-between">
            <span>Becsült Kamatláb / THM:</span>
            <span className="font-extrabold text-amber-400">{interestRate}%</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={3.0}
              max={12.0}
              step={0.1}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {interestRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Calculated Result Display Card (IV.15 Requirement) */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-amber-500/20">
          <div>
            <span className="text-xs font-bold text-amber-300/80 uppercase tracking-wider block">
              Becsült Havi Törlesztő:
            </span>
            <div className="text-3xl font-black text-amber-400 mt-1">
              {formatPrice(monthlyInstallment)} <span className="text-sm font-bold text-slate-400">/ hó</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs text-slate-400">
              Szükséges Hitelösszeg: <strong className="text-slate-200">{formatPrice(loanAmount)}</strong>
            </div>
            <div className="text-xs text-slate-400">
              Teljes Visszafizetendő: <strong className="text-slate-200">{formatPrice(totalRepayment)}</strong>
            </div>
          </div>
        </div>

        {/* Responsible Financial Disclaimer (IV.15 Requirement) */}
        <div className="flex items-start gap-2.5 bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-200/90 leading-relaxed">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Felelős Tájékoztatás:</strong> A megadott törlesztőrészlet és THM kizárólag indikatív, tájékoztató jellegű számítás. Nem minősül a Polgári Törvénykönyv szerinti ajánlattételnek, és nem képez hivatalos banki ajánlatot vagy kötelezettségvállalást. A végleges feltételek a választott pénzintézet egyedi hitelbírálatától függenek.
          </div>
        </div>
      </div>
    </div>
  );
};
