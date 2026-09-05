import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Usuario } from '../types/database';
import { getDb } from '../lib/neon';
import { hashPassword, verifyPassword } from '../lib/crypto';

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (nome: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'balbino_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Usuario;
        setUser(parsed);
      }
    } catch (err) {
      console.error('Erro ao recuperar sessão:', err);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return { success: false, error: 'Por favor, informe o e-mail e a senha.' };
      }

      const sql = getDb();
      // Search for user by email
      const rows = await sql`
        SELECT id, nome, email, senha_hash, created_at 
        FROM usuarios 
        WHERE LOWER(email) = ${normalizedEmail} 
        LIMIT 1;
      `;

      if (!rows || rows.length === 0) {
        return { success: false, error: 'E-mail ou senha incorretos.' };
      }

      const dbUser = rows[0];
      const isValid = await verifyPassword(password, dbUser.senha_hash);

      if (!isValid) {
        return { success: false, error: 'E-mail ou senha incorretos.' };
      }

      const authenticatedUser: Usuario = {
        id: dbUser.id,
        nome: dbUser.nome,
        email: dbUser.email,
        created_at: dbUser.created_at,
      };

      setUser(authenticatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));

      return { success: true };
    } catch (err: unknown) {
      console.error('Erro no login:', err);
      const message = err instanceof Error ? err.message : 'Falha na conexão com o servidor. Tente novamente.';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    nome: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const trimmedNome = nome.trim();
      const normalizedEmail = email.trim().toLowerCase();

      // Basic validations
      if (!trimmedNome) {
        return { success: false, error: 'Por favor, informe seu nome completo.' };
      }

      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, error: 'Por favor, informe um e-mail válido.' };
      }

      if (password.length < 6) {
        return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
      }

      const sql = getDb();

      // Check if email already exists
      const existing = await sql`
        SELECT id FROM usuarios WHERE LOWER(email) = ${normalizedEmail} LIMIT 1;
      `;

      if (existing && existing.length > 0) {
        return { success: false, error: 'Este e-mail já está cadastrado. Tente fazer login.' };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Insert new user
      const inserted = await sql`
        INSERT INTO usuarios (nome, email, senha_hash)
        VALUES (${trimmedNome}, ${normalizedEmail}, ${passwordHash})
        RETURNING id, nome, email, created_at;
      `;

      if (!inserted || inserted.length === 0) {
        return { success: false, error: 'Não foi possível cadastrar o usuário. Tente novamente.' };
      }

      const newUser: Usuario = {
        id: inserted[0].id,
        nome: inserted[0].nome,
        email: inserted[0].email,
        created_at: inserted[0].created_at,
      };

      // Create default account for new user
      try {
        await sql`
          INSERT INTO contas (usuario_id, nome_instituicao, saldo_inicial, tipo_conta)
          VALUES (${newUser.id}, 'Conta Principal', 0, 'Corrente');
        `;
      } catch (accErr) {
        console.warn('Erro ao criar conta inicial padrão:', accErr);
      }

      setUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));

      return { success: true };
    } catch (err: unknown) {
      console.error('Erro no cadastro:', err);
      const message = err instanceof Error ? err.message : 'Falha ao realizar cadastro. Tente novamente.';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
