import React, { useState } from 'react';
import { SystemConfig } from '../types';
import { AppUser } from './LoginView';
import { 
  Settings2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  RotateCcw, 
  Check, 
  Percent, 
  Coins, 
  TrendingUp,
  Save,
  HelpCircle,
  Database,
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  X,
  UserCheck,
  UserX
} from 'lucide-react';

interface AdminViewProps {
  config: SystemConfig;
  onUpdateConfig: (newConfig: SystemConfig) => void;
  onResetDatabase: () => void;
  users: AppUser[];
  onUpdateUsers: (users: AppUser[]) => void;
  currentUser: AppUser | null;
}


export default function AdminView({ config, onUpdateConfig, onResetDatabase, users, onUpdateUsers, currentUser }: AdminViewProps) {
  const [formData, setFormData] = useState<SystemConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'users'>('config');
  
  // User management state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState<Partial<AppUser>>({
    username: '', password: '', name: '', role: 'consultor', email: '', active: true
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'defaultTaxRate' || name === 'multiplierCitricos' || name === 'multiplierUrbano'
        ? Number(value) : value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };


  const handleResetToDefaultConfig = () => {
    const defaultConfig: SystemConfig = {
      appName: 'Tecnología Alcalá',
      subTitle: 'TASACIONES & PERITAJES',
      peritoName: 'Carlos Mendoza',
      peritoRole: 'Tasador Senior',
      defaultMunicipality: 'Alcalá de Henares',
      defaultTaxRate: 21,
      multiplierCitricos: 25.5,
      multiplierUrbano: 1600,
      supportEmail: 'soporte@tecnologiaalcala.es',
      contactPhone: '+34 91 885 4000'
    };
    setFormData(defaultConfig);
    onUpdateConfig(defaultConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // User CRUD handlers
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', name: '', role: 'consultor', email: '', active: true });
    setShowUserForm(true);
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setUserForm({ ...user, password: '' });
    setShowUserForm(true);
  };


  const handleSaveUser = () => {
    if (!userForm.username?.trim() || !userForm.name?.trim() || !userForm.email?.trim()) {
      alert('Los campos usuario, nombre y email son obligatorios.');
      return;
    }
    if (!editingUser && !userForm.password?.trim()) {
      alert('La contrasena es obligatoria para nuevos usuarios.');
      return;
    }
    if (editingUser) {
      const updated = users.map(u => u.id === editingUser.id ? {
        ...u,
        username: userForm.username!,
        name: userForm.name!,
        role: userForm.role as 'admin' | 'perito' | 'consultor',
        email: userForm.email!,
        active: userForm.active ?? true,
        ...(userForm.password ? { password: userForm.password } : {})
      } : u);
      onUpdateUsers(updated);
    } else {
      const newUser: AppUser = {
        id: `USR-${Date.now()}`,
        username: userForm.username!,
        password: userForm.password!,
        name: userForm.name!,
        role: (userForm.role as 'admin' | 'perito' | 'consultor') || 'consultor',
        email: userForm.email!,
        active: userForm.active ?? true
      };
      onUpdateUsers([...users, newUser]);
    }
    setShowUserForm(false);
    setEditingUser(null);
  };


  const handleDeleteUser = (id: string) => {
    if (currentUser && currentUser.id === id) {
      alert('No puedes eliminar tu propia cuenta.');
      return;
    }
    onUpdateUsers(users.filter(u => u.id !== id));
    setDeleteConfirmId(null);
  };

  const handleToggleActive = (id: string) => {
    if (currentUser && currentUser.id === id) {
      alert('No puedes desactivar tu propia cuenta.');
      return;
    }
    onUpdateUsers(users.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">Admin</span>;
      case 'perito': return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded">Perito</span>;
      default: return <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-[10px] font-bold rounded">Consultor</span>;
    }
  };

  const inputClass = "bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans w-full";


  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6 select-none animate-fade-in text-on-surface">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-on-surface tracking-tight font-sans flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            <span>Panel de Administracion</span>
          </h2>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Configuracion del sistema, gestion de usuarios y mantenimiento de datos.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-container-high border border-outline rounded-lg p-1">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2.5 px-4 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'config' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Configuracion</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 px-4 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'users' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios ({users.length})</span>
        </button>
      </div>


      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2.5 text-xs font-bold">
          <Check className="w-4 h-4 shrink-0" />
          <span>Configuracion guardada con exito.</span>
        </div>
      )}

      {/* CONFIG TAB */}
      {activeTab === 'config' && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            
            {/* Brand */}
            <div className="bg-surface border border-outline rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-outline pb-3">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider">Identidad de Marca</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Nombre Empresa</label>
                  <input type="text" name="appName" value={formData.appName} onChange={handleChange} required className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Subtitulo</label>
                  <input type="text" name="subTitle" value={formData.subTitle} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>


            {/* Perito */}
            <div className="bg-surface border border-outline rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-outline pb-3">
                <User className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider">Perito por Defecto</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Nombre Perito</label>
                  <input type="text" name="peritoName" value={formData.peritoName} onChange={handleChange} required className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Cargo</label>
                  <input type="text" name="peritoRole" value={formData.peritoRole} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Coefficients */}
            <div className="bg-surface border border-outline rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-outline pb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider">Coeficientes de Tasacion</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1"><Percent className="w-3 h-3" />IVA (%)</label>
                  <input type="number" step="0.1" name="defaultTaxRate" value={formData.defaultTaxRate} onChange={handleChange} required className={inputClass + " font-mono"} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1"><Coins className="w-3 h-3" />Citricos (EUR/m2)</label>
                  <input type="number" step="0.01" name="multiplierCitricos" value={formData.multiplierCitricos} onChange={handleChange} required className={inputClass + " font-mono"} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1"><Building2 className="w-3 h-3" />Urbano (EUR/m2)</label>
                  <input type="number" step="1" name="multiplierUrbano" value={formData.multiplierUrbano} onChange={handleChange} required className={inputClass + " font-mono"} />
                </div>
              </div>
            </div>


            {/* Contact */}
            <div className="bg-surface border border-outline rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-outline pb-3">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider">Contacto y Soporte</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Email Soporte</label>
                  <input type="email" name="supportEmail" value={formData.supportEmail} onChange={handleChange} required className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Telefono</label>
                  <input type="text" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className={inputClass + " font-mono"} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Municipio Sede</label>
                  <input type="text" name="defaultMunicipality" value={formData.defaultMunicipality} onChange={handleChange} required className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-surface border border-outline rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-wider">Acciones</h4>
              <button type="submit" className="w-full bg-primary hover:bg-primary/80 text-on-primary font-bold text-xs py-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                <Save className="w-4 h-4" /><span>Guardar Configuracion</span>
              </button>
              <button type="button" onClick={handleResetToDefaultConfig} className="w-full bg-surface hover:bg-surface-container-high border border-outline text-on-surface font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" /><span>Valores por Defecto</span>
              </button>
            </div>


            <div className="bg-surface border border-outline rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-outline pb-2">
                <Database className="w-4 h-4 text-error" />
                <h4 className="text-xs font-black uppercase text-error tracking-wider">Mantenimiento BD</h4>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">Restaurar expedientes a valores de fabrica.</p>
              <button type="button" onClick={() => { if (confirm('Reiniciar todos los expedientes?')) { onResetDatabase(); } }}
                className="w-full py-2 bg-surface hover:bg-error/10 text-error border border-error/30 font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /><span>Restablecer Expedientes</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Users Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-on-surface">Gestion de Usuarios</h3>
              <span className="text-[10px] bg-surface-container-high border border-outline px-2 py-0.5 rounded font-mono text-on-surface-variant">{users.length} registrados</span>
            </div>
            <button onClick={handleOpenNewUser} className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer hover:bg-primary/80 transition-all">
              <Plus className="w-4 h-4" /><span>Nuevo Usuario</span>
            </button>
          </div>


          {/* Users Table */}
          <div className="bg-surface border border-outline rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline text-on-surface-variant font-bold">
                  <th className="p-3 text-left uppercase tracking-wider">Usuario</th>
                  <th className="p-3 text-left uppercase tracking-wider">Nombre</th>
                  <th className="p-3 text-left uppercase tracking-wider">Email</th>
                  <th className="p-3 text-center uppercase tracking-wider">Rol</th>
                  <th className="p-3 text-center uppercase tracking-wider">Estado</th>
                  <th className="p-3 text-center uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{user.username}</td>
                    <td className="p-3 text-on-surface font-medium">{user.name}</td>
                    <td className="p-3 text-on-surface-variant">{user.email}</td>
                    <td className="p-3 text-center">{getRoleBadge(user.role)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleToggleActive(user.id)} className="cursor-pointer" title={user.active ? 'Desactivar' : 'Activar'}>
                        {user.active
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] font-bold rounded"><UserCheck className="w-3 h-3" />Activo</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] font-bold rounded"><UserX className="w-3 h-3" />Inactivo</span>
                        }
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleOpenEditUser(user)} className="p-1.5 hover:bg-primary/20 rounded text-on-surface-variant hover:text-primary cursor-pointer" title="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirmId(user.id)} className="p-1.5 hover:bg-red-500/20 rounded text-on-surface-variant hover:text-red-400 cursor-pointer" title="Eliminar"
                          disabled={currentUser?.id === user.id}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {/* Roles info */}
          <div className="bg-surface-container-high border border-outline rounded-lg p-4 text-[11px] text-on-surface-variant space-y-1.5">
            <p className="font-bold text-on-surface text-xs flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-primary" /> Roles del sistema:</p>
            <p><span className="font-bold text-primary">Admin</span> — Acceso total: configuracion, usuarios, CRUD expedientes.</p>
            <p><span className="font-bold text-green-400">Perito</span> — Crear, editar y eliminar expedientes. Sin acceso a configuracion.</p>
            <p><span className="font-bold text-secondary">Consultor</span> — Solo lectura de expedientes y dashboard.</p>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-outline shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowUserForm(false)} className="p-1 hover:bg-surface-container-high rounded cursor-pointer text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>


            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Usuario *</label>
                  <input type="text" value={userForm.username || ''} onChange={e => setUserForm(p => ({...p, username: e.target.value}))} className={inputClass} placeholder="nombre.usuario" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">{editingUser ? 'Nueva Contrasena' : 'Contrasena *'}</label>
                  <input type="password" value={userForm.password || ''} onChange={e => setUserForm(p => ({...p, password: e.target.value}))} className={inputClass} placeholder={editingUser ? '(dejar vacio = no cambiar)' : '••••••'} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase">Nombre Completo *</label>
                <input type="text" value={userForm.name || ''} onChange={e => setUserForm(p => ({...p, name: e.target.value}))} className={inputClass} placeholder="Nombre Apellido" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Email *</label>
                  <input type="email" value={userForm.email || ''} onChange={e => setUserForm(p => ({...p, email: e.target.value}))} className={inputClass} placeholder="email@empresa.es" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Rol</label>
                  <select value={userForm.role || 'consultor'} onChange={e => setUserForm(p => ({...p, role: e.target.value as any}))} className={inputClass}>
                    <option value="admin">Administrador</option>
                    <option value="perito">Perito</option>
                    <option value="consultor">Consultor</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface-variant">
                <input type="checkbox" checked={userForm.active ?? true} onChange={e => setUserForm(p => ({...p, active: e.target.checked}))} className="w-4 h-4 rounded" />
                <span>Cuenta activa</span>
              </label>
            </div>


            <div className="flex justify-end gap-3 pt-3 border-t border-outline">
              <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-bold cursor-pointer hover:bg-surface-container-high">Cancelar</button>
              <button type="button" onClick={handleSaveUser} className="px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold cursor-pointer hover:bg-primary/80 flex items-center gap-2">
                <Save className="w-3.5 h-3.5" /><span>{editingUser ? 'Actualizar' : 'Crear Usuario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-outline shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm text-on-surface">Eliminar Usuario</h3>
            </div>
            <p className="text-xs text-on-surface-variant">Se eliminara permanentemente el usuario <span className="font-bold text-on-surface font-mono">{users.find(u => u.id === deleteConfirmId)?.username}</span>. Esta accion no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-bold cursor-pointer">Cancelar</button>
              <button onClick={() => handleDeleteUser(deleteConfirmId)} className="px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-red-600 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /><span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
