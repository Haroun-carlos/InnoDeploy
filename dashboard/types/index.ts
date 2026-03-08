/** Authenticated user returned from the API */
export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "developer" | "viewer";
}

/** Auth API response shape */
export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** Project placeholder (Sprint-2) */
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
}

/** Generic API error */
export interface ApiError {
  message: string;
  errors?: string[];
}
