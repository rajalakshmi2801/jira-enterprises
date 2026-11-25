
export interface DashboardToday {
  totalSales: number;
  totalReceived: number;
  totalExpenses: number;
  costOfGoods: number;
  grossProfit: number;
  estimatedNetProfit: number;
  salesCount: number;
}

export interface DashboardCredit {
  outstanding: number;
}

export interface DashboardStockItem {
  variantId: string;
  variantName: string;
  piecesPerCase: number;
  product: {
    product_name?: string;
    brand_name?: string;
  } | null;
  stockCases: number;
}

export interface DashboardInventory {
  totalStockCases: number;
  totalVariants: number;
  lowStockCount: number;
  lowStockItems: DashboardStockItem[];
  stockDetails: DashboardStockItem[];
}

export interface DashboardRecentSale {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  status: string;
  customer: {
    customer_name?: string;
    shop_name?: string;
  } | null;
}

export interface DashboardNote {
  id: string;
  title: string;
  reminder_at: string | null;
}

export interface DashboardData {
  today: DashboardToday;
  credit: DashboardCredit;
  inventory: DashboardInventory;
  recentSales: DashboardRecentSale[];
  pendingNotes: DashboardNote[];
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}
