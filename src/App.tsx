import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./features/dashboard/DashboardPage";

import LoginPage from "./features/auth/LoginPage";
import SetupPage from "./features/auth/SetupPage";
import ForgotPinPage from "./features/auth/ForgotPinPage";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import { AuthProvider } from "./features/auth/AuthContext";

import SalesPage from "./features/sales/SalesPage";
import CustomersPage from "./features/customers/CustomersPage";
import InventoryPage from "./features/inventory/InventoryPage";
import PurchasesPage from "./features/purchases/PurchasesPage";
import PaymentsPage from "./features/payments/PaymentsPage";
import ExpensesPage from "./features/expenses/ExpensesPage";
import ReportsPage from "./features/reports/ReportsPage";
import NotesPage from "./features/notes/NotesPage";
import SettingsPage from "./features/settings/SettingsPage";
import UsersPage from "./features/users/UsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{ style: { fontSize: "13px" } }}
        />

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />

          {/* Owner and viewer */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Owner only */}
          <Route element={<ProtectedRoute ownerOnly />}>
            <Route element={<AppLayout />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          {/* Invalid URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
