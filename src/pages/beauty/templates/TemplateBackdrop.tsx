import type { ReactNode } from "react";
import type { ProfileTemplate } from "./templateConfig";
import { hexToRgba } from "./glassStyles";

export function TemplateBackdrop({ theme, children }: { theme: ProfileTemplate; children: ReactNode }) {
  const isDark = theme.style === "cosmic_purple" || theme.style === "neon_cyberpunk";
  return (
    <div className="relative min-h-screen">
      {theme.bgImage && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${theme.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(40px) brightness(0.9) saturate(0.5)",
          }}
        />
      )}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: theme.bgImage
            ? hexToRgba(isDark ? "#141221" : "#ffffff", 0.94)
            : theme.style === "minimal_bw"
              ? "#ffffff"
              : hexToRgba(theme.primaryColor, 0.03),
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
