import { firstOf } from "./format";
import type { SaleCustomer } from "../services/business.api";

/** Display name for a (possibly missing) customer relation. */
export function customerLabel(
  customer: SaleCustomer | SaleCustomer[] | null | undefined
) {
  const one = firstOf(customer);

  return one?.shop_name || one?.customer_name || "Walk-in customer";
}
