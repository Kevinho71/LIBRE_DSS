import { RegisterInput, LoginInput } from './auth.schema';

export type RegisterDto = RegisterInput;
export type LoginDto = LoginInput;

export interface UserSummaryDto {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt: string;
}

export interface EmpresaSummaryDto {
  id: string;
  nombre: string;
  nit: string | null;
  plan: string;
  createdAt: string;
}

export interface AuthResponseDto {
  token: string;
  usuario: UserSummaryDto;
  empresa: EmpresaSummaryDto;
}
