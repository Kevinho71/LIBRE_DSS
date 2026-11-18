import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSummaryDto, EmpresaSummaryDto, AuthResponseDto, RegisterDto } from '@libredss/shared';
import { client, setToken, getToken } from '@/api/client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  usuario: UserSummaryDto | null;
  empresa: EmpresaSummaryDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN: 'libredss_token',
  USER: 'libredss_user',
  EMPRESA: 'libredss_empresa',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [usuario, setUsuario] = useState<UserSummaryDto | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [empresa, setEmpresa] = useState<EmpresaSummaryDto | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEYS.EMPRESA);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUsuario(null);
    setEmpresa(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.EMPRESA);
    }
  }, []);

  const persistAuth = useCallback((data: AuthResponseDto) => {
    setToken(data.token);
    setTokenState(data.token);
    setUsuario(data.usuario);
    setEmpresa(data.empresa);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.usuario));
      localStorage.setItem(STORAGE_KEYS.EMPRESA, JSON.stringify(data.empresa));
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    const data = await client.post<AuthResponseDto>('/auth/login', credentials);
    persistAuth(data);
  };

  const register = async (dto: RegisterDto): Promise<void> => {
    const data = await client.post<AuthResponseDto>('/auth/register', dto);
    persistAuth(data);
  };

  // Validar sesión al montar si existe un token
  useEffect(() => {
    const verifySession = async () => {
      const currentToken = getToken();
      if (!currentToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userSummary = await client.get<UserSummaryDto>('/auth/me');
        setUsuario(userSummary);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userSummary));
        }
      } catch (err: any) {
        // Si el token es inválido o expiró, cerrar sesión
        if (err?.statusCode === 401) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [logout]);

  // Escuchar evento global 401 de client.ts
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('libredss:unauthorized', handleUnauthorized);
      return () => {
        window.removeEventListener('libredss:unauthorized', handleUnauthorized);
      };
    }
  }, [logout]);

  const value: AuthContextType = {
    usuario,
    empresa,
    token,
    isAuthenticated: Boolean(token && usuario),
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
