/** Matches backend/.../auth/dto/UserResponse.java (docs/api-reference.md). */
export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  role: "ADMIN" | "USER";
}
