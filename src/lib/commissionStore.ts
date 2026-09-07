/**
 * Commission Store for Business (Shop) Accounts
 * Tracks 2% monthly sales commissions and generates monthly invoices/settlements.
 */

import { calculateBusinessCommission } from "./feeCalculator";

export interface BusinessSaleRecord {
  id: string;
  sellerId: string;
  sellerCompanyName: string;
  itemTitle: string;
  saleAmount: number; // Listed product price in HUF
  commissionAmount: number; // 2% commission in HUF
  saleDate: string; // ISO date string YYYY-MM-DD
  monthPeriod: string; // YYYY-MM format
}

export interface MonthlyCommissionSettlement {
  id: string;
  sellerId: string;
  sellerCompanyName: string;
  monthPeriod: string; // e.g. "2026-08"
  monthName: string; // e.g. "2026. Augusztus"
  totalSalesCount: number;
  totalSalesVolume: number; // Total revenue of seller in HUF
  totalCommissionDue: number; // Total 2% commission owed to platform
  status: "DUE" | "PAID";
  dueDate: string;
  paidAt?: string;
  invoiceNumber?: string;
}

const STORAGE_SALES_KEY = "ilolit_business_sales_records";
const STORAGE_SETTLEMENTS_KEY = "ilolit_business_commission_settlements";

// Initial mock sales data for demo
const INITIAL_SALES: BusinessSaleRecord[] = [
  {
    id: "sale-101",
    sellerId: "biz-fox-tech",
    sellerCompanyName: "Róka Tech Kft.",
    itemTitle: "Apple iPhone 15 Pro Max 256GB",
    saleAmount: 449000,
    commissionAmount: calculateBusinessCommission(449000), // 8980 Ft
    saleDate: "2026-08-15",
    monthPeriod: "2026-08",
  },
  {
    id: "sale-102",
    sellerId: "biz-fox-tech",
    sellerCompanyName: "Róka Tech Kft.",
    itemTitle: "Sony WH-1000XM5 Fejhallgató",
    saleAmount: 119000,
    commissionAmount: calculateBusinessCommission(119000), // 2380 Ft
    saleDate: "2026-08-20",
    monthPeriod: "2026-08",
  },
  {
    id: "sale-103",
    sellerId: "biz-fox-tech",
    sellerCompanyName: "Róka Tech Kft.",
    itemTitle: "MacBook Air M2 16GB RAM",
    saleAmount: 389000,
    commissionAmount: calculateBusinessCommission(389000), // 7780 Ft
    saleDate: "2026-08-24",
    monthPeriod: "2026-08",
  },
];

const INITIAL_SETTLEMENTS: MonthlyCommissionSettlement[] = [
  {
    id: "settlement-2026-07",
    sellerId: "biz-fox-tech",
    sellerCompanyName: "Róka Tech Kft.",
    monthPeriod: "2026-07",
    monthName: "2026. Július",
    totalSalesCount: 8,
    totalSalesVolume: 1850000,
    totalCommissionDue: 37000,
    status: "PAID",
    dueDate: "2026-08-10",
    paidAt: "2026-08-08 14:22",
    invoiceNumber: "INV-2026-07-8891",
  },
  {
    id: "settlement-2026-08",
    sellerId: "biz-fox-tech",
    sellerCompanyName: "Róka Tech Kft.",
    monthPeriod: "2026-08",
    monthName: "2026. Augusztus",
    totalSalesCount: 3,
    totalSalesVolume: 957000,
    totalCommissionDue: 19140, // 2% of 957,000
    status: "DUE",
    dueDate: "2026-09-10",
    invoiceNumber: "INV-2026-08-9104",
  },
];

/**
 * Gets all recorded sales for business seller
 */
export function getBusinessSalesRecords(): BusinessSaleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_SALES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_SALES_KEY, JSON.stringify(INITIAL_SALES));
      return INITIAL_SALES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SALES;
  }
}

/**
 * Gets all monthly commission settlements for business seller
 */
export function getMonthlyCommissionSettlements(): MonthlyCommissionSettlement[] {
  try {
    const raw = localStorage.getItem(STORAGE_SETTLEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_SETTLEMENTS_KEY, JSON.stringify(INITIAL_SETTLEMENTS));
      return INITIAL_SETTLEMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SETTLEMENTS;
  }
}

/**
 * Records a new completed sale and logs 2% commission
 */
export function recordBusinessSale(
  sellerId: string,
  sellerCompanyName: string,
  itemTitle: string,
  saleAmount: number
): BusinessSaleRecord {
  const sales = getBusinessSalesRecords();
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  
  const monthPeriod = `${year}-${month}`;
  const saleDate = `${year}-${month}-${day}`;
  const commissionAmount = calculateBusinessCommission(saleAmount);

  const newRecord: BusinessSaleRecord = {
    id: `sale-${Date.now()}`,
    sellerId,
    sellerCompanyName,
    itemTitle,
    saleAmount,
    commissionAmount,
    saleDate,
    monthPeriod,
  };

  sales.unshift(newRecord);
  localStorage.setItem(STORAGE_SALES_KEY, JSON.stringify(sales));

  // Recalculate monthly settlement
  recalculateMonthlySettlement(sellerId, sellerCompanyName, monthPeriod);

  return newRecord;
}

/**
 * Recalculates or updates monthly settlement statement
 */
function recalculateMonthlySettlement(
  sellerId: string,
  sellerCompanyName: string,
  monthPeriod: string
) {
  const sales = getBusinessSalesRecords().filter(
    (s) => s.sellerId === sellerId && s.monthPeriod === monthPeriod
  );
  const settlements = getMonthlyCommissionSettlements();

  const totalVolume = sales.reduce((acc, curr) => acc + curr.saleAmount, 0);
  const totalComm = sales.reduce((acc, curr) => acc + curr.commissionAmount, 0);

  const index = settlements.findIndex(
    (st) => st.sellerId === sellerId && st.monthPeriod === monthPeriod
  );

  const monthNames: Record<string, string> = {
    "01": "Január", "02": "Február", "03": "Március", "04": "Április",
    "05": "Május", "06": "Június", "07": "Július", "08": "Augusztus",
    "09": "Szeptember", "10": "Október", "11": "November", "12": "December",
  };
  const [y, m] = monthPeriod.split("-");
  const formattedMonthName = `${y}. ${monthNames[m] || m}`;

  const updatedSettlement: MonthlyCommissionSettlement = {
    id: `settlement-${monthPeriod}`,
    sellerId,
    sellerCompanyName,
    monthPeriod,
    monthName: formattedMonthName,
    totalSalesCount: sales.length,
    totalSalesVolume: totalVolume,
    totalCommissionDue: totalComm,
    status: index >= 0 ? settlements[index].status : "DUE",
    dueDate: `${y}-${String(Number(m) + 1).padStart(2, "0")}-10`,
    invoiceNumber: index >= 0 ? settlements[index].invoiceNumber : `INV-${monthPeriod}-${Math.floor(1000 + Math.random() * 9000)}`,
  };

  if (index >= 0) {
    settlements[index] = updatedSettlement;
  } else {
    settlements.unshift(updatedSettlement);
  }

  localStorage.setItem(STORAGE_SETTLEMENTS_KEY, JSON.stringify(settlements));
}

/**
 * Marks a monthly commission settlement as paid
 */
export function markSettlementPaid(settlementId: string): boolean {
  const settlements = getMonthlyCommissionSettlements();
  const item = settlements.find((s) => s.id === settlementId);
  if (item) {
    item.status = "PAID";
    item.paidAt = new Date().toISOString().replace("T", " ").substring(0, 16);
    localStorage.setItem(STORAGE_SETTLEMENTS_KEY, JSON.stringify(settlements));
    return true;
  }
  return false;
}
