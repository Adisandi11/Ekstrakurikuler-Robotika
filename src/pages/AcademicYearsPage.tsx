import React, { useState } from 'react';
import { CalendarDays, Plus, CheckCircle, Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { Modal } from '../components/common/Modal';
import { AcademicYear } from '../types';

export const AcademicYearsPage: React.FC = () => {
  const { academicYears, refreshAcademicInfo, showToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingAY, setEditingAY] = useState<AcademicYear | null>(null);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('inactive');
  const [loading, setLoading] = useState(false);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingAY(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setStatus('inactive');
    setModalOpen(true);
  };

  const handleOpenEdit = (ay: AcademicYear) => {
    setModalMode('edit');
    setEditingAY(ay);
    setName(ay.name);
    setStartDate(ay.start_date);
    setEndDate(ay.end_date);
    setStatus(ay.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalMode === 'create') {
        await apiService.createAcademicYear({ name, start_date: startDate, end_date: endDate, status });
        showToast('Tahun ajaran berhasil ditambahkan.');
      } else if (modalMode === 'edit' && editingAY) {
        await apiService.updateAcademicYear(editingAY.id, { name, start_date: startDate, end_date: endDate });
        showToast('Tahun ajaran berhasil diperbarui.');
      }
      refreshAcademicInfo();
      setModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan tahun ajaran.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await apiService.setActiveAcademicYear(id);
      showToast('Tahun ajaran aktif diperbarui.');
      refreshAcademicInfo();
    } catch (err: any) {
      showToast('Gagal mengubah tahun ajaran aktif.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Kelola Tahun Ajaran</h2>
          <p className="text-xs text-slate-500 mt-1">Atur periode akademik tahun ajaran kegiatan ekstrakurikuler.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/30 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tahun Ajaran</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Nama Tahun Ajaran</th>
              <th className="py-3.5 px-4">Tanggal Mulai</th>
              <th className="py-3.5 px-4">Tanggal Selesai</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {academicYears.map((ay) => (
              <tr key={ay.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <span>{ay.name}</span>
                </td>
                <td className="py-3.5 px-4">{ay.start_date}</td>
                <td className="py-3.5 px-4">{ay.end_date}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    ay.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ay.status === 'active' ? 'Aktif (Default)' : 'Non-aktif'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenEdit(ay)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Edit Tahun Ajaran"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {ay.status !== 'active' && (
                      <button
                        onClick={() => handleSetActive(ay.id)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Jadikan Aktif
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Tambah Tahun Ajaran Baru' : 'Edit Tahun Ajaran'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Tahun Ajaran</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: 2026/2027"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              {loading ? 'Lagi menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
