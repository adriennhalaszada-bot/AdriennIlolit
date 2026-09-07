import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface IlolitBadgeProps {
  className?: string;
  showText?: boolean;
}

export function IlolitBadge({ className, showText = false }: IlolitBadgeProps) {
  return (
    <div className={cn("flex items-center gap-1 text-ilolit bg-ilolit/10 px-2 py-0.5 rounded-full text-xs font-medium w-fit", className)}>
      <ShieldCheck className="w-3.5 h-3.5" />
      {showText && <span>Ilolit</span>}
    </div>
  );
}
