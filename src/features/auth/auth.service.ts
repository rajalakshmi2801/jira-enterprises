import api from "../../services/api";

export interface AuthUser {
  id: string;
  ownerName: string;
  role: "owner" | "viewer";
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: AuthUser;
}

export interface MeResponse {
  success: boolean;
  user: AuthUser;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export async function login(
  mobile: string,
  pin: string
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", {
    mobile: mobile.trim(),
    pin,
  });

  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<MeResponse>("/auth/me");

  return response.data.user;
}

export async function logout(): Promise<LogoutResponse> {
  const response = await api.post<LogoutResponse>("/auth/logout");

  return response.data;
}

/** Signed-in user changes their own PIN (current session stays active). */
export async function changePin(
  currentPin: string,
  newPin: string
): Promise<void> {
  await api.post("/auth/change-pin", { currentPin, newPin });
}

/** Owner forgot the PIN: reset it using the backend setup secret. */
export async function resetOwnerPin(input: {
  mobile: string;
  newPin: string;
}): Promise<void> {
  await api.post("/auth/reset-pin", {
    mobile: input.mobile.trim(),
    newPin: input.newPin,
  });
}

export async function getSetupStatus(): Promise<boolean> {
  const response = await api.get<{ needsSetup: boolean }>(
    "/auth/setup-status"
  );

  return response.data.needsSetup;
}

export async function setupOwner(input: {
  ownerName: string;
  email?: string;
  mobile: string;
  pin: string;
}): Promise<void> {
  await api.post("/auth/setup-owner", input);
}
