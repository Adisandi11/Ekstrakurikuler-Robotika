import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowLeft, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/api';
import { Program, ProgramSession } from '../types';
import { Modal } from '../components/common/Modal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { useApp } from '../context/AppContext';

interface ProgramDetailPageProps {
  programId: string;
  onBack: () => void;
}

export const ProgramDetailPage: React.FC<ProgramDetailPageProps> = ({ programId, onBack }) => {
  const [program, setProgram] = useState<(Program & { sessions: ProgramSession[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ProgramSession | null>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [sessionNum, setSessionNum] = useState(1);
  const [topicName, setTopicName] = useState('');
  const [practice1, setPractice1] = useState('');
  const [practice2, setPractice2] = useState('');
  const [outcome, setOutcome] = useState('');
  const { showToast } = useApp();

  useEffect(() => {
    loadProgramDetail();
  }, [programId]);

  const loadProgramDetail = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProgram(programId);
      setProgram(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isScratch = program ? (program.id.includes('scratch') || program.name.toLowerCase().includes('scratch')) : false;

  const openSessionModal = (sess?: ProgramSession) => {
    if (sess) {
      setEditingSession(sess);
      setSessionNum(sess.session_number);
      setTopicName(sess.topic_name);
      setPractice1(sess.practice_1);
      setPractice2(sess.practice_2 || '');
      setOutcome(sess.learning_outcome);
    } else {
      setEditingSession(null);
      setSessionNum((program?.sessions.length || 0) + 1);
      setTopicName('');
      setPractice1('');
      setPractice2('');
      setOutcome('');
    }
    setModalOpen(true);
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await apiService.updateSession(editingSession.id, {
          session_number: Number(sessionNum),
          topic_name: topicName,
          practice_1: practice1,
          practice_2: practice2,
          learning_outcome: outcome
        });
        showToast('Sesi silabus berhasil diperbarui.');
      } else {
        await apiService.createSession(programId, {
          session_number: Number(sessionNum),
          topic_name: topicName,
          practice_1: practice1,
          practice_2: practice2,
          learning_outcome: outcome
        });
        showToast('Sesi silabus baru berhasil ditambahkan.');
      }
      loadProgramDetail();
      setModalOpen(false);
    } catch (err: any) {
      showToast('Gagal menyimpan sesi silabus.', 'error');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await apiService.deleteSession(id);
      showToast('Sesi silabus berhasil dihapus.');
      loadProgramDetail();
    } catch (err: any) {
      showToast('Gagal menghapus sesi.', 'error');
    }
  };

  const confirmDeleteProgramDetail = async () => {
    if (!program) return;
    setDeleteLoading(true);
    try {
      await apiService.deleteProgram(program.id);
      showToast('Silabus berhasil dihapus.');
      setDeleteModalOpen(false);
      onBack();
    } catch (err: any) {
      showToast('Gagal menghapus silabus.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading || !program) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{program.name}</h2>
            <p className="text-xs text-slate-500">Detail Master Kurikulum & Template {program.total_sessions} Sesi</p>
          </div>
        </div>

        <button
          onClick={() => setDeleteModalOpen(true)}
          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hapus Silabus</span>
        </button>
      </div>

      {/* Program Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Tujuan Pembelajaran Main Objectives</h3>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {program.learning_objectives.map((obj, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Kompetensi yang Dikembangkan</h3>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {program.competencies.map((comp, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{comp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 12 Sessions Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Daftar Sesi Pembelajaran ({program.sessions.length} Sesi)</h3>
            <p className="text-xs text-slate-500">Materi dan proyek praktik yang akan dilaksanakan siswa</p>
          </div>
          <button
            onClick={() => openSessionModal()}
            className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sesi</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Pertemuan</th>
                <th className="py-3 px-4">{isScratch ? 'Materi Pokok' : 'Materi Utama'}</th>
                <th className="py-3 px-4">{isScratch ? 'Kegiatan Praktik' : 'Praktik Robot 1'}</th>
                {!isScratch && <th className="py-3 px-4">Praktik Robot 2</th>}
                <th className="py-3 px-4">{isScratch ? 'Tugas / Hasil Belajar' : 'Hasil Belajar / Target'}</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {program.sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs">
                      Sesi #{sess.session_number}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">{sess.topic_name}</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-bold">{sess.practice_1}</td>
                  {!isScratch && <td className="py-3.5 px-4 text-slate-600">{sess.practice_2 || '-'}</td>}
                  <td className="py-3.5 px-4 text-slate-600">{sess.learning_outcome}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openSessionModal(sess)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSession ? 'Edit Sesi Silabus' : 'Tambah Sesi Silabus Baru'}
      >
        <form onSubmit={handleSubmitSession} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Pertemuan / Sesi</label>
            <input
              type="number"
              value={sessionNum}
              onChange={(e) => setSessionNum(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{isScratch ? 'Materi Pokok' : 'Materi Pembelajaran'}</label>
            <input
              type="text"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              required
              placeholder={isScratch ? 'Contoh: Pengenalan Scratch & Computational Thinking' : 'Contoh: Pengenalan Robot & Keselamatan'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
            />
          </div>

          {isScratch ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kegiatan Praktik</label>
              <input
                type="text"
                value={practice1}
                onChange={(e) => setPractice1(e.target.value)}
                required
                placeholder="Contoh: Mengenal antarmuka Scratch, mencoba blok motion"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Praktik Robot 1</label>
                <input
                  type="text"
                  value={practice1}
                  onChange={(e) => setPractice1(e.target.value)}
                  required
                  placeholder="Contoh: Big Windmill"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Praktik Robot 2 (Opsional)</label>
                <input
                  type="text"
                  value={practice2}
                  onChange={(e) => setPractice2(e.target.value)}
                  placeholder="Contoh: Gorilla"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{isScratch ? 'Tugas / Hasil Belajar' : 'Hasil Belajar / Target'}</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              required
              placeholder={isScratch ? 'Contoh: Membuat 1 sprite yang bergerak dan menampilkan teks sapaan' : 'Contoh: Mengenal komponen & aturan keselamatan'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
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
              Simpan Sesi
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteProgramDetail}
        title="Hapus Master Silabus"
        message="Apakah Anda yakin ingin menghapus silabus master ini beserta seluruh daftar sesi topik?"
        itemName={program.name}
        loading={deleteLoading}
      />
    </div>
  );
};
