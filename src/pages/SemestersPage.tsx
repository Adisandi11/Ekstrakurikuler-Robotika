import React, { useState } from 'react';
import { Layers, Plus, CheckCircle, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { Modal } from '../components/common/Modal';

export const SemestersPage: React.FC = () => {
  const { semesters, activeAcademicYear, refreshAcademicInfo, showToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('Semester 2');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAcademicYear) {
      showToast('Tahun ajaran aktif belum tersedia', 'error');
      return;
    }
    setLoading(true);
    try {
      await apiService.createSemester({
        academic_year_id: activeAcademicYear.id,
        name,
        start_date: startDate,
        end_date: endDate,
        status: 'inactive'
      });
      showToast('Semester berhasil ditambahkan.');
      refreshAcademicInfo();
      setModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat semester baru.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await apiService.setActiveSemester(id);
      showToast('Semester aktif diperbarui.');
      refreshAcademicInfo();
    } catch (err: any) {
      showToast('Gagal memperbarui semester aktif.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Modul Semester</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola semester untuk Tahun Ajaran <strong>{activeAcademicYear?.name || '2026/2027'}</strong>.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Semester Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {semesters.map((sem) => (
          <div key={sem.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{sem.name}</h3>
                  <p className="text-xs text-slate-500">{sem.start_date || '2026-07-01'} sd {sem.end_date || '2026-12-31'}</p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                sem.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {sem.status === 'active' ? 'Aktif' : 'Non-aktif'}
              </span>
            </div>

            {/* Semester Program Structure info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <p className="font-bold text-slate-700 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Struktur Silabus Terjadwal:</span>
              </p>
              {sem.name === 'Semester 1' ? (
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li><strong>Tahap 1 (Bulan 1-3):</strong> Ekstrakurikuler Robot Dasar (12 Pertemuan)</li>
                  <li><strong>Tahap 2 (Bulan 4-6):</strong> Robotika & Coding LEGO WeDo (12 Pertemuan)</li>
                  <li className="text-indigo-600 font-bold">Total Semester 1: 24 Pertemuan</li>
                </ul>
              ) : (
                <p className="text-slate-500 italic">Dapat ditambahkan silabus baru tanpa mengubah struktur database.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              {sem.status !== 'active' && (
                <button
                  onClick={() => handleSetActive(sem.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Aktifkan Semester Ini
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Semester Baru"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Semester</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Semester 2"
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
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Simpan Semester
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
