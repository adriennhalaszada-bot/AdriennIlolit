import { useState, useEffect } from "react";
import { UserPlus, UserCheck, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowSellerConfigModal } from "./FollowSellerConfigModal";

interface FollowSellerButtonProps {
  sellerId: string;
  sellerName: string;
  compact?: boolean;
}

export function FollowSellerButton({
  sellerId,
  sellerName,
  compact = false,
}: FollowSellerButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`followed_seller_${sellerId}`);
    if (saved === "true") {
      setIsFollowing(true);
    }
  }, [sellerId]);

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFollowing) {
      // Open config modal on first follow so user can configure alert triggers
      setIsConfigOpen(true);
    } else {
      // Unfollow directly or open settings
      setIsFollowing(false);
      localStorage.setItem(`followed_seller_${sellerId}`, "false");
    }
  };

  const handleOpenSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfigOpen(true);
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant={isFollowing ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        onClick={handleToggleFollow}
        className={`font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 ${
          isFollowing
            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 hover:border-slate-400"
            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25"
        }`}
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Követve</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Eladó követése</span>
          </>
        )}
      </Button>

      {isFollowing && (
        <button
          type="button"
          onClick={handleOpenSettings}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 transition"
          title="Értesítési szabályok beállítása"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}

      <FollowSellerConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        sellerId={sellerId}
        sellerName={sellerName}
        onSave={() => setIsFollowing(true)}
      />
    </div>
  );
}
