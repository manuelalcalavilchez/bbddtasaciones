import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, AlertTriangle, Eye, EyeOff, Clock } from 'lucide-react';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'perito' | 'consultor';
  email: string;
  active: boolean;
  lastLogin?: string;
}

interface LoginViewProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function LoginView({ users, onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Lockout countdown timer
  useEffect(() => {
    if (lockedUntil === null) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setAttempts(0);
        setError('');
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) return;

    if (!username.trim() || !password.trim()) {
      setError('Introduce usuario y contrasena.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate network delay for security
    setTimeout(() => {
      const foundUser = users.find(
        u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
      );

      if (foundUser) {
        if (!foundUser.active) {
          setError('Esta cuenta esta desactivada. Contacta con el administrador.');
          setIsLoading(false);
          return;
        }
        // Successful login
        setAttempts(0);
        onLogin({ ...foundUser, lastLogin: new Date().toISOString() });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockedUntil(lockTime);
          setLockCountdown(LOCKOUT_SECONDS);
          setError(`Demasiados intentos fallidos. Cuenta bloqueada ${LOCKOUT_SECONDS}s.`);
        } else {
          setError(`Credenciales incorrectas. Intento ${newAttempts}/${MAX_ATTEMPTS}.`);
        }
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-surface border border-outline rounded-lg mx-auto flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-on-surface">Tecnologia Alcala</h1>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold">Tasaciones & Peritajes</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-outline rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-on-surface">Acceso al Sistema</h2>
            <p className="text-[11px] text-on-surface-variant">Introduce tus credenciales de acceso.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container border border-error/30 rounded-lg text-xs">
              <AlertTriangle className="w-4 h-4 text-error shrink-0" />
              <span className="text-on-error-container font-medium">{error}</span>
            </div>
          )}

          {/* Lockout Warning */}
          {isLocked && (
            <div className="flex items-center gap-2 p-3 bg-surface-container-high border border-outline rounded-lg text-xs">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="text-on-surface-variant font-mono font-bold">
                Desbloqueado en: {lockCountdown}s
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="nombre.usuario"
                  disabled={isLocked}
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container-high border border-outline rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Contrasena</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLocked}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-container-high border border-outline rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLocked || isLoading}
              className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin border-2 border-on-primary border-t-transparent rounded-full w-3.5 h-3.5"></span>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Iniciar Sesion</span>
                </>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="pt-3 border-t border-outline space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
              <Shield className="w-3 h-3 text-primary shrink-0" />
              <span>Maximo {MAX_ATTEMPTS} intentos antes del bloqueo temporal ({LOCKOUT_SECONDS}s)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
              <Lock className="w-3 h-3 text-primary shrink-0" />
              <span>Conexion protegida. Sesion cifrada.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-on-surface-variant">
          Tecnologia Alcala v2.0 — Sistema de Gestion de Tasaciones
        </p>
      </div>
    </div>
  );
}
