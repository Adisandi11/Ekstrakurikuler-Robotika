import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Edit2, Trash2, Search, Lock, UserPlus, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { Modal } from '../components/common/Modal';
import { User, Role } from '../types';

export const UsersPage: React.FC = () => {
  const { user: currentUser, showToast } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat data pengguna.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'superadmin') {
      loadUsers();
    }
  }, [currentUser]);

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3 max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-900">Akses Ditolak</h2>
        <p className="text-xs text-red-700">
          Halaman kelola akun pengguna ini hanya dapat diakses oleh akun dengan role Super Admin.
        </p>
      </div>
    );
  }

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setRole('admin');
    setPassword('');
    setConfirmPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setRole(u.role);
    setPassword('');
    setConfirmPassword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama pengguna tidak boleh kosong.', 'error');
      return;
    }
    if (!username.trim()) {
      showToast('Username tidak boleh kosong.', 'error');
      return;
    }
    if (!editingUser && !password) {
      showToast('Password wajib diisi untuk pengguna baru.', 'error');
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

    setSubmitting(true);
    try {
      if (editingUser) {
        await apiService.updateUser(editingUser.id, {
          name: name.trim(),
          username: username.trim(),
          role,
          ...(password ? { password } : {})
        });
        showToast('Data pengguna berhasil diperbarui!');
      } else {
        await apiService.createUser({
          name: name.trim(),
          username: username.trim(),
          role,
          password
        });
        showToast('Pengguna baru berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data pengguna.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await apiService.deleteUser(deletingUser.id);
      showToast('Pengguna berhasil dihapus!');
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengguna.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <UserCog className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900">Kelola Pengguna & Admin</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tambah, edit role, dan kelola hak akses akun pengguna sistem ekstra kurikuler.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Filter & Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau username..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">Total: {filteredUsers.length} Akun</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400">
            Memuat data akun pengguna...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400">
            Tidak ada pengguna ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role Akses</th>
                  <th className="py-3 px-4">Tanggal Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center shrink-0 uppercase text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-md font-bold">
                              Akun Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{u.username}</td>
                      <td className="py-3.5 px-4">
                        {u.role === 'superadmin' ? (
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-purple-200">
                            Super Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-blue-200">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="w-4 h-4 text-indigo-600" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pengguna (Display Name)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Username (ID Login)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: budi_admin"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Role Akses Pengguna</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {editingUser ? 'Password Baru (Opsional)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required={!editingUser}
            />
          </div>

          {password.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title="Hapus Akun Pengguna"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Apakah Anda yakin ingin menghapus akun pengguna <strong className="text-slate-900">{deletingUser?.name}</strong> ({deletingUser?.username})?
          </p>
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setDeletingUser(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              {deleting ? 'Menghapus...' : 'Hapus Pengguna'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
