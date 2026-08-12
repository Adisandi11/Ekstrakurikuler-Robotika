import React, { useState } from 'react';
import { School as SchoolIcon, Plus, Edit2, MapPin, Clock, Calendar, CheckCircle2, XCircle, ArrowRight, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { Modal } from '../components/common/Modal';
import { School } from '../types';

interface SchoolsPageProps {
  onSelectSchoolDetail: (schoolId: string) => void;
}

export const SchoolsPage: React.FC<SchoolsPageProps> = ({ onSelectSchoolDetail }) => {
  const { schools, refreshSchools, showToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu'>('Jumat');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('14:30');
  const [loading, setLoading] = useState(false);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
        showToast('Logo berhasil diunggah.');
      };
      reader.readAsDataURL(file);
    }
  };

  const openModal = (school?: School) => {
    if (school) {
      setEditingSchool(school);
      setName(school.name);
      setAddress(school.address || '');
      setLogo(school.logo || '');
      setDayOfWeek(school.day_of_week);
      setStartTime(school.start_time);
      setEndTime(school.end_time);
    } else {
      setEditingSchool(null);
      setName('');
      setAddress('');
      setLogo('');
      setDayOfWeek('Jumat');
      setStartTime('13:00');
      setEndTime('14:30');
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSchool) {
        await apiService.updateSchool(editingSchool.id, {
          name, address, logo, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime
        });
        showToast('Data sekolah berhasil diperbarui.');
      } else {
        await apiService.createSchool({
          name, address, logo, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime
        });
        showToast('Sekolah baru berhasil ditambahkan.');
      }
      refreshSchools();
      setModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data sekolah.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (school: School) => {
    try {
      await apiService.toggleSchoolActive(school.id);
      showToast(`Status ${school.name} diperbarui.`);
      refreshSchools();
    } catch (err: any) {
      showToast('Gagal mengubah status sekolah.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Sistem Kelola Sekolah</h2>
          <p className="text-xs text-slate-500 mt-1">Daftar Sekolah Dasar yang mengikuti program ekstrakurikuler Robotika & Coding.</p>
        </div>
        <button
          id="add-school-button"
          onClick={() => openModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Sekolah Baru</span>
        </button>
      </div>

      {/* Schools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schools.map((school) => (
          <div key={school.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0">
                    {school.logo ? (
                      <img src={school.logo} alt={school.name} className="w-full h-full object-cover" />
                    ) : (
                      <SchoolIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{school.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        school.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {school.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openModal(school)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Edit Sekolah"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Schedule Info */}
              <div className="mt-5 space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Hari Kegiatan: <strong className="text-slate-800">{school.day_of_week}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Jam Pelaksanaan: <strong className="text-slate-800">{school.start_time} – {school.end_time} WIB</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{school.address || 'Alamat belum diatur'}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleToggleActive(school)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  school.is_active
                    ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                    : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                {school.is_active ? 'Non-aktifkan' : 'Aktifkan'}
              </button>

              <button
                onClick={() => onSelectSchoolDetail(school.id)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <span>Detail & Progress</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSchool ? 'Edit Data Sekolah' : 'Tambah Sekolah Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sekolah Dasar</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: SDIT RMK / SDN 1 Darma"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Jl. Raya Utama No. X"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hari Kegiatan</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Logo Sekolah (Upload File Lokal)</label>
            {logo ? (
              <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                  <img src={logo} alt="Preview Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Logo Sekolah Terpasang</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Foto siap disimpan</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLogo('')}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ganti / Hapus</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all p-3 text-center group">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-6 h-6 mb-1 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">Pilih File Logo dari Perangkat</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Format PNG, JPG, WEBP (Maksimal 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30"
            >
              {loading ? 'Memproses...' : 'Simpan Data Sekolah'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
