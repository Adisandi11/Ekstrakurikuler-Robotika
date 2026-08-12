import React, { useState } from 'react';
import { User as UserIcon, Save, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user, setUser, showToast } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || 'admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama pengguna tidak boleh kosong.', 'error');
      return;
    }
    if (!username.trim()) {
      showToast('Username tidak boleh kosong.', 'error');
      return;
    }
    if (password && password !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'error');
      return;
    }
    if (password && password.length < 6) {
      showToast('Password minimal 6 karakter.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.updateProfile({
        name: name.trim(),
        username: username.trim(),
        ...(password ? { password } : {})
      });
      setUser(res.user);
      setPassword('');
      setConfirmPassword('');
      showToast('Profil pengguna berhasil diperbarui!');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan profil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Profil Saya</h2>
          <p className="text-xs text-slate-500 mt-1">Kelola nama pengguna, username login, dan kata sandi Anda.</p>
        </div>
        <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center space-x-1.5 text-xs font-bold text-indigo-700">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Role: {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center space-x-2">
            <UserIcon className="w-4 h-4 text-indigo-600" />
            <span>Informasi Pengguna</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pengguna (Display Name)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username (ID Login)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center space-x-2 mb-4">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Ganti Kata Sandi (Password)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diubah"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              * Isi kolom password jika Anda ingin mengganti kata sandi login sistem.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
