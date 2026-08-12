import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Copy, Trash2, ArrowRight, Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { Program } from '../types';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';

interface ProgramsPageProps {
  onSelectProgramDetail: (programId: string) => void;
}

export const ProgramsPage: React.FC<ProgramsPageProps> = ({ onSelectProgramDetail }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [cleanDuplicatesModalOpen, setCleanDuplicatesModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showToast } = useApp();

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMonths, setDurationMonths] = useState(3);
  const [totalSessions, setTotalSessions] = useState(12);
  const [targetParticipants, setTargetParticipants] = useState('Siswa/Siswi kelas 4-6');
  const [method, setMethod] = useState('Fun Learning & Project Based Learning');
  const [media, setMedia] = useState('Kit Robot');

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const list = await apiService.getPrograms();
      setPrograms(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createProgram({
        name,
        description,
        duration_months: Number(durationMonths),
        total_sessions: Number(totalSessions),
        session_duration_minutes: 90,
        target_participants: targetParticipants,
        method,
        media
      });
      showToast('Program / Silabus master berhasil dibuat.');
      loadPrograms();
      setModalOpen(false);
    } catch (err: any) {
      showToast('Gagal membuat program.', 'error');
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.duplicateProgram(id);
      showToast('Silabus master berhasil diduplikasi.');
      loadPrograms();
    } catch (err: any) {
      showToast('Gagal menduplikasi program.', 'error');
    }
  };

  const confirmDeleteProgram = async () => {
    if (!programToDelete) return;
    setDeleteLoading(true);
    try {
      await apiService.deleteProgram(programToDelete.id);
      showToast('Silabus berhasil dihapus.');
      setProgramToDelete(null);
      loadPrograms();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus silabus.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmCleanDuplicatePrograms = async () => {
    setDeleteLoading(true);
    try {
      const res = await apiService.cleanDuplicatePrograms();
      showToast(res.message);
      setCleanDuplicatesModalOpen(false);
      loadPrograms();
    } catch (err: any) {
      showToast('Gagal membersihkan duplikat silabus.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Master Kurikulum & Silabus</h2>
          <p className="text-xs text-slate-500 mt-1">
            Silabus berfungsi sebagai template kurikulum utama untuk kegiatan pembelajaran.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setCleanDuplicatesModalOpen(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
            title="Bersihkan duplikat silabus"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Bersihkan Duplikat</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Program Baru</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {programs.map((prog) => (
          <div key={prog.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{prog.name}</h3>
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                      {prog.duration_months} Bulan &bull; {prog.total_sessions} Pertemuan (90 menit/sesi)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleDuplicate(prog.id, e)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Duplikasi Silabus Template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProgramToDelete(prog);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Hapus Silabus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{prog.description}</p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-700">
                <p><strong>Sasaran:</strong> {prog.target_participants}</p>
                <p><strong>Metode:</strong> {prog.method}</p>
                <p><strong>Media/Kit:</strong> {prog.media}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Status: Master Active
              </span>

              <button
                onClick={() => onSelectProgramDetail(prog.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <span>Lihat {prog.total_sessions || 12} Materi Pertemuan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Master Program / Silabus Baru"
      >
        <form onSubmit={handleCreateProgram} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Program Silabus</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Ekstrakurikuler Robotik Pemula"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Durasi (Bulan)</label>
              <input
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Sesi Pertemuan</label>
              <input
                type="number"
                value={totalSessions}
                onChange={(e) => setTotalSessions(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sasaran Peserta</label>
            <input
              type="text"
              value={targetParticipants}
              onChange={(e) => setTargetParticipants(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Media Pembelajaran / Kit</label>
            <input
              type="text"
              value={media}
              onChange={(e) => setMedia(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
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
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Simpan Master Program
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Single Program Modal */}
      <ConfirmDeleteModal
        isOpen={!!programToDelete}
        onClose={() => setProgramToDelete(null)}
        onConfirm={confirmDeleteProgram}
        title="Hapus Master Silabus"
        message="Apakah Anda yakin ingin menghapus silabus ini? Semua daftar sesi topik, presensi, dan penilaian terkait akan dihapus secara permanen."
        itemName={programToDelete ? programToDelete.name : ''}
        loading={deleteLoading}
      />

      {/* Clean Duplicate Programs Modal */}
      <ConfirmDeleteModal
        isOpen={cleanDuplicatesModalOpen}
        onClose={() => setCleanDuplicatesModalOpen(false)}
        onConfirm={confirmCleanDuplicatePrograms}
        title="Bersihkan Silabus Duplikat"
        message="Sistem akan mendeteksi dan menghapus silabus duplikat dengan nama serupa."
        loading={deleteLoading}
      />
    </div>
  );
};
