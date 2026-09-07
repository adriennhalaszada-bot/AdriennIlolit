import type { CSSProperties } from "react";
import type { ProfileTemplate } from "./templateConfig";

export function gradientText(theme: ProfileTemplate): CSSProperties {
  return {
    color: theme.style === "minimal_bw" ? "#1a1a1a" : theme.primaryColor,
  };
}

export function gradientButton(theme: ProfileTemplate): CSSProperties {
  return {
    background: theme.primaryColor,
    color: theme.style === "minimal_bw" ? theme.secondaryColor : "#fff",
    border: "none",
    boxShadow: `0 4px 14px ${hexToRgba(theme.primaryColor, 0.18)}`,
  };
}

export function glassCard(theme: ProfileTemplate): CSSProperties {
  return {
    background: "#ffffff",
    border: `1px solid ${hexToRgba(theme.primaryColor, 0.12)}`,
    boxShadow: `0 4px 20px ${hexToRgba(theme.primaryColor, 0.06)}`,
  };
}

export function accentBadge(theme: ProfileTemplate): CSSProperties {
  return {
    background: hexToRgba(theme.primaryColor, 0.1),
    color: theme.primaryColor,
    border: `1px solid ${hexToRgba(theme.primaryColor, 0.2)}`,
  };
}

export function selectedPill(theme: ProfileTemplate): CSSProperties {
  return {
    background: theme.primaryColor,
    color: "#fff",
    borderColor: "transparent",
    boxShadow: `0 4px 14px ${hexToRgba(theme.primaryColor, 0.2)}`,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
