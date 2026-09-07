/**
 * Fee Calculator Utility for Marketplace Overhaul
 * - Biztonsági díj (Buyer Safety Fee): (itemPrice * 5%) + 280 Ft (gross, incl. VAT)
 * - Kereskedői jutalék (Business Commission): 2% per completed sale
 */

export interface FeeBreakdown {
  itemPrice: number;
  safetyFee: number;
  totalBuyerPrice: number;
  safetyFeePercentage: number;
  safetyFeeFixed: number;
}

export const SAFETY_FEE_LABEL = "Biztonsági díj";
export const SAFETY_FEE_SUBTEXT = "+ Biztonsági díj – a nyugodt és biztonságos vásárlásodért";
export const SAFETY_FEE_TOOLTIP = "A Biztonsági díj segít abban, hogy nyugodtan és gondtalanul vásárolhass a piactéren.";

/**
 * Calculates the exact Buyer Safety Fee: (Price * 5%) + 280 Ft
 */
export function calculateSafetyFee(itemPrice: number): number {
  if (!itemPrice || itemPrice <= 0) return 0;
  const percentageFee = itemPrice * 0.05;
  const fixedFee = 280;
  return Math.round(percentageFee + fixedFee);
}

/**
 * Returns full fee breakdown for checkout and product pages
 */
export function getFeeBreakdown(itemPrice: number): FeeBreakdown {
  const price = Math.max(0, itemPrice);
  const safetyFee = calculateSafetyFee(price);
  return {
    itemPrice: price,
    safetyFee,
    totalBuyerPrice: price + safetyFee,
    safetyFeePercentage: 5,
    safetyFeeFixed: 280,
  };
}

/**
 * Calculates 2% Business seller commission per completed sale
 */
export function calculateBusinessCommission(itemPrice: number): number {
  if (!itemPrice || itemPrice <= 0) return 0;
  return Math.round(itemPrice * 0.02);
}
