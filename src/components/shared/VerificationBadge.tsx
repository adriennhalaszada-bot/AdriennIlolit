import React, { useState } from 'react';
import { ShieldCheck, Check, X, ShieldAlert, Award, Building, UserCheck, Phone, Mail, MapPin, BadgeCheck } from 'lucide-react';

export interface VerificationItems {
  email?: boolean;
  phone?: boolean;
  identity?: boolean;        // Személyazonosság
  business?: boolean;        // Vállalkozás / Adószám
  qualifications?: boolean;  // Végzettség / Oklevél
  location?: boolean;        // Szolgáltatási hely
  sellerStatus?: boolean;    // Eladói státusz
}

interface VerificationBadgeProps {
  verifications: VerificationItems;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verifications,
  showText = true,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const verificationMap = [
    { key: 'email', label: 'E-mail cím igazolva', icon: Mail, value: !!verifications.email },
    { key: 'phone', label: 'Telefonszám igazolva', icon: Phone, value: !!verifications.phone },
    { key: 'identity', label: 'Személyazonosság ellenőrizve', icon: UserCheck, value: !!verifications.identity },
    { key: 'business', label: 'Vállalkozás & Cégadatok igazolva', icon: Building, value: !!verifications.business },
    { key: 'qualifications', label: 'Szakmai végzettség / Oklevél hitelesítve', icon: Award, value: !!verifications.qualifications },
    { key: 'location', label: 'Szolgáltatási helyszín ellenőrizve', icon: MapPin, value: !!verifications.location },
    { key: 'sellerStatus', label: 'Hivatalos ILOLIT eladói státusz', icon: BadgeCheck, value: !!verifications.sellerStatus },
  ];

  const verifiedCount = verificationMap.filter((v) => v.value).length;
  const totalCount = verificationMap.length;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`inline-flex items-center font-semibold rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${sizeClasses[size]}`}
        title="ILOLIT VERIFIED status - kattints a részletekért"
      >
        <ShieldCheck size={iconSizes[size]} className="fill-slate-950 stroke-amber-400" />
        {showText && <span>ILOLIT VERIFIED</span>}
        <span className="bg-slate-950 text-amber-400 rounded-full px-1.5 py-0.2 text-[10px] font-bold">
          {verifiedCount}/{totalCount}
        </span>
      </button>

      {/* Popover showing exact status to prevent misleading claims */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 mt-2 w-80 bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-4 text-slate-100 text-xs backdrop-blur-lg animate-in fade-in slide-in-from-top-2"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-amber-400" size={20} />
              <div>
                <h4 className="font-bold text-amber-400 text-sm">ILOLIT VERIFIED</h4>
                <p className="text-[11px] text-slate-400">Ténylegesen ellenőrzött adatok</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
              {verifiedCount} Igazolt
            </span>
          </div>

          <div className="space-y-2">
            {verificationMap.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    item.value ? 'bg-slate-800/80 text-slate-100' : 'bg-slate-900/50 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon size={15} className={item.value ? 'text-amber-400' : 'text-slate-600'} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  {item.value ? (
                    <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
                      <Check size={14} className="mr-0.5" /> Ellenőrizve
                    </span>
                  ) : (
                    <span className="flex items-center text-slate-500 text-[11px]">
                      <X size={14} className="mr-0.5" /> Nem ellenőrzött
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center italic">
            Az ILOLIT csak a ténylegesen igazolt dokumentumokat tünteti fel ellenőrzöttként.
          </div>
        </div>
      )}
    </div>
  );
};
