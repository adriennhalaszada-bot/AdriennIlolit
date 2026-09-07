import { useState } from "react";
import { Calculator, Info } from "lucide-react";

interface VehicleFinancingCalculatorProps {
  vehiclePrice: number;
}

export function VehicleFinancingCalculator({ vehiclePrice }: VehicleFinancingCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30); // 30% default
  const [tenureMonths, setTenureMonths] = useState<number>(48); // 48 months default
  const annualInterestRate = 0.079; // 7.9% THM

  // Calculations
  const downPaymentAmount = Math.round((vehiclePrice * downPaymentPercent) / 100);
  const loanPrincipal = Math.max(0, vehiclePrice - downPaymentAmount);
  
  const monthlyRate = annualInterestRate / 12;
  const estimatedMonthlyPayment = loanPrincipal > 0 && tenureMonths > 0
    ? Math.round(
        (loanPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths))) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      )
    : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Becsült Havi Finanszírozás
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Számold ki az ideális lízing vagy hitel havi törlesztőrészletét!
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
          Irányadó THM: 7,9%
        </span>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Down Payment % Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
            <span>Önerő mértéke ({downPaymentPercent}%)</span>
            <span className="text-emerald-600 font-extrabold">
              {downPaymentAmount.toLocaleString()} Ft
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="5"
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>Min. 20%</span>
            <span>Max. 80%</span>
          </div>
        </div>

        {/* Tenure Months Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
            <span>Futamidő ({tenureMonths} hónap)</span>
            <span className="text-emerald-600 font-extrabold">
              {(tenureMonths / 12).toFixed(1)} év
            </span>
          </div>
          <input
            type="range"
            min="12"
            max="84"
            step="6"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>12 hónap (1 év)</span>
            <span>84 hónap (7 év)</span>
          </div>
        </div>
      </div>

      {/* Result Box */}
      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
            Várható Havi Törlesztő
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ~{estimatedMonthlyPayment.toLocaleString()} Ft <span className="text-xs font-bold text-slate-400">/ hó</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 font-medium">
          <div>Hitelösszeg: <strong>{loanPrincipal.toLocaleString()} Ft</strong></div>
          <div>Futamidő: <strong>{tenureMonths} hónap</strong></div>
        </div>
      </div>

      {/* Legal Disclaimer Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs font-medium leading-relaxed">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong>Jogi és pénzügyi tájékoztatás:</strong> A megjelenített összeg becsült havi finanszírozási kalkuláció, nem minősül hivatalos banki vagy finanszírozási ajánlatnak. A végleges THM és a havi részlet a banki hitelbírálat és az egyedi finanszírozási feltételek függvényében változhat.
        </span>
      </div>
    </div>
  );
}
