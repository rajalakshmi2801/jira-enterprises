
import api from "../../services/api";
import type { DashboardResponse } from "./dashboard.types";

export async function getDashboardData() {
  const response = await api.get<DashboardResponse>("/dashboard");

  return response.data.data;
}
