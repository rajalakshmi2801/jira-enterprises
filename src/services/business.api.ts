import api from "./api";

/* =========================================
   SHARED
========================================= */

interface Wrapped<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function data<T>(
  request: Promise<{ data: Wrapped<T> }>
): Promise<T> {
  return (await request).data.data;
}

export type PaymentMethod = "cash" | "upi";

/* =========================================
   CATEGORIES
========================================= */

export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const categoriesApi = {
  list: () => data<Category[]>(api.get("/categories")),
  create: (input: { name: string; description?: string | null }) =>
    data<Category>(api.post("/categories", input)),
  update: (
    id: string,
    input: { name: string; description?: string | null }
  ) => data<Category>(api.put(`/categories/${id}`, input)),
  setStatus: (id: string, is_active: boolean) =>
    data<Category>(api.patch(`/categories/${id}/status`, { is_active })),
};

/* =========================================
   PRODUCTS & VARIANTS
========================================= */

export interface Variant {
  id: string;
  product_id: string;
  variant_name: string;
  size_value: number | null;
  size_unit: string | null;
  pieces_per_case: number;
  landing_price_per_piece: number | null;
  mrp_per_piece: number | null;
  landing_price_per_case: number;
  mrp_per_case: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  product_name: string;
  brand_name: string | null;
  description: string | null;
  is_active: boolean;
  product_categories: { id: string; name: string } | null;
  product_variants: Variant[];
}

export interface NewVariantInput {
  variant_name: string;
  size_value?: number | null;
  size_unit?: string | null;
  pieces_per_case: number;
  landing_price_per_case: number;
  mrp_per_case: number;
  landing_price_per_piece?: number | null;
  mrp_per_piece?: number | null;
  initial_stock_cases?: number;
}

export interface VariantUpdate {
  variantName?: string;
  sizeValue?: number | null;
  sizeUnit?: string | null;
  piecesPerCase?: number;
  landingPricePerPiece?: number | null;
  mrpPerPiece?: number | null;
  landingPricePerCase?: number;
  mrpPerCase?: number;
  isActive?: boolean;
}

export const productsApi = {
  list: async () =>
    (await api.get<{ products: Product[] }>("/products")).data.products,
  createWithVariants: (input: {
    categoryId: string;
    productName: string;
    brandName?: string;
    description?: string;
    variants: NewVariantInput[];
  }) => api.post("/products/with-variants", input),
  update: (
    id: string,
    input: {
      categoryId?: string;
      productName?: string;
      brandName?: string | null;
      description?: string | null;
      isActive?: boolean;
    }
  ) => api.put(`/products/${id}`, input),
  addVariant: (input: {
    productId: string;
    variantName: string;
    sizeValue?: number;
    sizeUnit?: string;
    piecesPerCase: number;
    landingPricePerCase: number;
    mrpPerCase: number;
  }) => api.post("/products/variants", input),
  updateVariant: (id: string, input: VariantUpdate) =>
    api.put(`/products/variants/${id}`, input),
};

/* =========================================
   INVENTORY
========================================= */

export interface InventoryItem {
  product_variant_id: string;
  product_id: string;
  product_name: string;
  brand_name: string | null;
  variant_name: string;
  pieces_per_case: number;
  landing_price_per_case: number;
  mrp_per_case: number;
  available_cases: number;
}

export type MovementType =
  | "opening_stock"
  | "purchase"
  | "sale"
  | "adjustment"
  | "return"
  | "damage";

export interface StockMovement {
  id: string;
  product_variant_id: string;
  movement_type: MovementType;
  quantity_cases: number;
  reference_id: string | null;
  movement_date: string;
  remarks: string | null;
}

export const inventoryApi = {
  list: () => data<InventoryItem[]>(api.get("/inventory")),
  movements: (params?: { product_variant_id?: string; limit?: number }) =>
    data<StockMovement[]>(
      api.get("/inventory/movements", { params: { limit: 200, ...params } })
    ),
  addMovement: (input: {
    product_variant_id: string;
    movement_type: "opening_stock" | "adjustment" | "return" | "damage";
    quantity_cases: number;
    remarks?: string;
  }) => data<StockMovement>(api.post("/inventory/movements", input)),
};

/* =========================================
   CUSTOMERS
========================================= */

export interface Customer {
  id: string;
  customer_name: string;
  shop_name: string | null;
  mobile: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomerInput {
  customer_name: string;
  shop_name?: string | null;
  mobile?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CreditSummary {
  customer_id: string;
  total_sales: number;
  total_paid: number;
  outstanding_amount: number;
}

export const customersApi = {
  list: (search?: string) =>
    data<Customer[]>(api.get("/customers", { params: { search } })),
  create: (input: CustomerInput) =>
    data<Customer>(api.post("/customers", input)),
  update: (id: string, input: CustomerInput) =>
    data<Customer>(api.put(`/customers/${id}`, input)),
  deactivate: (id: string) =>
    data<Customer>(api.patch(`/customers/${id}/deactivate`)),
  credit: (id: string) =>
    data<CreditSummary>(api.get(`/customers/${id}/credit`)),
};

/* =========================================
   SALES & PAYMENTS
========================================= */

export interface SalePayment {
  id: string;
  payment_method: PaymentMethod;
  amount: number;
  payment_date: string;
  transaction_reference: string | null;
  notes?: string | null;
}

export interface SaleLine {
  id: string;
  product_variant_id: string;
  quantity_cases: number;
  cost_price_per_case: number;
  selling_price_per_case: number;
  subtotal: number;
  product_variants: {
    variant_name: string;
    size_value: number | null;
    size_unit: string | null;
    products: { product_name: string; brand_name: string | null } | null;
  } | null;
}

export interface SaleCustomer {
  id: string;
  customer_name: string;
  shop_name: string | null;
  mobile: string | null;
  address?: string | null;
}

export interface Sale {
  id: string;
  invoice_number: string | null;
  customer_id: string | null;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  notes: string | null;
  status: "completed" | "cancelled";
  customers: SaleCustomer | SaleCustomer[] | null;
  sale_items: SaleLine[];
  payments: SalePayment[];
}

export interface NewSaleInput {
  customer_id?: string | null;
  sale_date?: string;
  discount_amount?: number;
  notes?: string;
  items: Array<{
    product_variant_id: string;
    quantity_cases: number;
    selling_price_per_case: number;
  }>;
  paid_amount: number;
  payment_method?: PaymentMethod | null;
  transaction_reference?: string;
}

export interface CustomerOutstanding {
  customer_id: string;
  customer: SaleCustomer | SaleCustomer[] | null;
  total_sales: number;
  total_paid: number;
  outstanding_amount: number;
}

export interface CustomerSale {
  id: string;
  invoice_number: string | null;
  customer_id: string;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  status: string;
  payments: Array<{
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
  }>;
}

export const salesApi = {
  list: (limit = 200) => data<Sale[]>(api.get("/sales", { params: { limit } })),
  get: (id: string) => data<Sale>(api.get(`/sales/${id}`)),
  create: (input: NewSaleInput) =>
    data<{ sale_id: string }>(api.post("/sales", input)),
  outstanding: () =>
    data<CustomerOutstanding[]>(api.get("/sales/credit/outstanding")),
  customerSales: (customerId: string) =>
    data<CustomerSale[]>(api.get(`/sales/customer/${customerId}`, { params: { limit: 500 } })),
  collectPayment: (input: {
    sale_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date?: string;
    transaction_reference?: string;
    notes?: string;
  }) => data<{ payment_id: string }>(api.post("/sales/credit/collect-payment", input)),
};

export function paidOf(sale: { payments?: Array<{ amount: number }> }) {
  return (sale.payments ?? []).reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );
}

/* =========================================
   PURCHASES
========================================= */

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_variant_id: string;
  quantity_cases: number;
  purchase_price_per_case: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  supplier_name: string | null;
  invoice_number: string | null;
  purchase_date: string;
  total_amount: number;
  notes: string | null;
  items: PurchaseItem[];
}

export const purchasesApi = {
  list: (limit = 200) =>
    data<Purchase[]>(api.get("/purchases", { params: { limit } })),
  create: (input: {
    supplier_name?: string;
    invoice_number?: string;
    purchase_date?: string;
    notes?: string;
    items: Array<{
      product_variant_id: string;
      quantity_cases: number;
      purchase_price_per_case: number;
    }>;
  }) => data<{ purchase_id: string }>(api.post("/purchases", input)),
};

/* =========================================
   EXPENSES
========================================= */

export interface Expense {
  id: string;
  expense_title: string;
  category: string | null;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod | null;
  description: string | null;
}

export interface ExpenseInput {
  expense_title: string;
  category?: string | null;
  amount: number;
  expense_date: string;
  payment_method?: PaymentMethod | null;
  description?: string | null;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalExpenseCount: number;
  categorySummary: Record<string, number>;
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: string;
}

export const expensesApi = {
  list: (filters: ExpenseFilters = {}) =>
    data<Expense[]>(api.get("/business-expenses", { params: filters })),
  summary: (filters: ExpenseFilters = {}) =>
    data<ExpenseSummary>(
      api.get("/business-expenses/summary", { params: filters })
    ),
  create: (input: ExpenseInput) =>
    data<Expense>(api.post("/business-expenses", input)),
  update: (id: string, input: Partial<ExpenseInput>) =>
    data<Expense>(api.put(`/business-expenses/${id}`, input)),
  remove: (id: string) => api.delete(`/business-expenses/${id}`),
};

/* =========================================
   NOTES
========================================= */

export interface Note {
  id: string;
  title: string;
  description: string | null;
  reminder_at: string | null;
  is_completed: boolean;
  created_at?: string;
}

export interface NoteInput {
  title: string;
  description?: string | null;
  reminder_at?: string | null;
}

export const notesApi = {
  list: (status: "all" | "pending" | "completed" = "all") =>
    data<Note[]>(api.get("/notes", { params: { status } })),
  create: (input: NoteInput) => data<Note>(api.post("/notes", input)),
  update: (id: string, input: NoteInput) =>
    data<Note>(api.put(`/notes/${id}`, input)),
  setCompleted: (id: string, is_completed: boolean) =>
    data<Note>(api.patch(`/notes/${id}/completion`, { is_completed })),
  remove: (id: string) => api.delete(`/notes/${id}`),
};

/* =========================================
   REPORTS
========================================= */

export interface ReportSale {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  status: string;
}

export interface ReportSaleItem {
  id: string;
  sale_id: string;
  product_variant_id: string;
  quantity_cases: number;
  cost_price_per_case: number;
  selling_price_per_case: number;
  subtotal: number;
}

export interface ReportPurchase {
  id: string;
  supplier_name: string | null;
  invoice_number: string | null;
  purchase_date: string;
  total_amount: number;
  notes: string | null;
}

export interface ReportPurchaseItem {
  id: string;
  purchase_id: string;
  product_variant_id: string;
  quantity_cases: number;
  purchase_price_per_case: number;
  subtotal: number;
}

export interface ReportExpense {
  id: string;
  expense_title: string;
  category: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
}

export interface ReportRange {
  from: string;
  to: string;
}

export const reportsApi = {
  overview: (range: ReportRange) =>
    data<{
      sales: {
        salesCount: number;
        totalSales: number;
        totalDiscounts: number;
        totalCasesSold: number;
      };
      purchases: {
        purchaseCount: number;
        totalPurchases: number;
        totalCasesPurchased: number;
      };
      expenses: {
        expenseCount: number;
        totalExpenses: number;
        categorySummary: Record<string, number>;
      };
      profit: {
        totalSales: number;
        costOfGoodsSold: number;
        grossProfit: number;
        totalExpenses: number;
        netProfit: number;
      };
    }>(api.get("/reports/overview", { params: range })),
  sales: (range: ReportRange) =>
    data<{ sales: ReportSale[]; saleItems: ReportSaleItem[] }>(
      api.get("/reports/sales", { params: range })
    ),
  purchases: (range: ReportRange) =>
    data<{ purchases: ReportPurchase[]; purchaseItems: ReportPurchaseItem[] }>(
      api.get("/reports/purchases", { params: range })
    ),
  expenses: (range: ReportRange) =>
    data<{ expenses: ReportExpense[] }>(
      api.get("/reports/expenses", { params: range })
    ),
};

/* =========================================
   USERS & SETTINGS
========================================= */

export interface UserRow {
  id: string;
  owner_name: string;
  email: string | null;
  mobile: string;
  role: "owner" | "viewer";
  is_active: boolean;
  created_at: string;
}

export const usersApi = {
  list: async () =>
    (await api.get<{ users: UserRow[] }>("/users")).data.users,
  createViewer: (input: {
    ownerName: string;
    email?: string;
    mobile: string;
    pin: string;
  }) => api.post("/users", input),
  setStatus: (id: string, isActive: boolean) =>
    api.patch(`/users/${id}/status`, { isActive }),
  resetPin: (id: string, pin: string) =>
    api.patch(`/users/${id}/pin`, { pin }),
};

export interface BusinessSettings {
  business_name: string | null;
  owner_name: string;
  email: string | null;
  mobile: string;
}

export const settingsApi = {
  get: () => data<BusinessSettings>(api.get("/settings")),
  update: (input: {
    business_name?: string;
    owner_name?: string;
    email?: string | null;
  }) => data<BusinessSettings>(api.patch("/settings", input)),
};
