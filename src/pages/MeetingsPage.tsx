import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, Edit3, Filter } from 'lucide-react';
import { apiService } from '../services/api';
import { Meeting } from '../types';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';

interface MeetingsPageProps {
  onSelectMeetingDetail: (meetingId: string) => void;
  presetSchoolId?: string;
}

export const MeetingsPage: React.FC<MeetingsPageProps> = ({ onSelectMeetingDetail, presetSchoolId }) => {
  const { selectedSchoolId, showToast } = useApp();
  const [meetings, setMeetings] = useState<(Meeting & { school_name: string; program_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Edit Date Modal State
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('13:00');
  const [editEndTime, setEditEndTime] = useState('14:30');
  const [editStatus, setEditStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, [selectedSchoolId, presetSchoolId, statusFilter]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const schoolToUse = presetSchoolId || selectedSchoolId;
      const list = await apiService.getMeetings({
        school_id: schoolToUse,
        status: statusFilter
      });
      setMeetings(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (mtg: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMeeting(mtg);
    setEditDate(mtg.meeting_date);
    setEditStartTime(mtg.start_time || '13:00');
    setEditEndTime(mtg.end_time || '14:30');
    setEditStatus(mtg.status || 'scheduled');
  };

  const handleSaveMeetingDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    setSaving(true);
    try {
      await apiService.updateMeeting(editingMeeting.id, {
        meeting_date: editDate,
        start_time: editStartTime,
        end_time: editEndTime,
        status: editStatus
      });
      showToast('Tanggal dan jadwal pertemuan berhasil diperbarui.');
      setEditingMeeting(null);
      loadMeetings();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah tanggal pertemuan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Jadwal & Agenda Pertemuan Aktual</h2>
          <p className="text-xs text-slate-500 mt-1">
            Daftar pertemuan aktual sekolah. Anda dapat mengatur tanggal setiap pertemuan secara mandiri (misal menggeser hari libur/tanggal merah).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="font-bold text-slate-600">Filter Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-semibold text-slate-800"
        >
          <option value="">Semua Status</option>
          <option value="scheduled">Terjadwal (Scheduled)</option>
          <option value="completed">Selesai (Completed)</option>
          <option value="cancelled">Dibatalkan / Libur (Cancelled)</option>
        </select>
      </div>

      {/* Meetings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Tidak ada jadwal pertemuan yang ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((mtg) => (
            <div
              key={mtg.id}
              onClick={() => onSelectMeetingDetail(mtg.id)}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold rounded-lg text-[11px] border border-indigo-100">
                    Pertemuan #{mtg.meeting_number}
                  </span>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    mtg.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : mtg.status === 'scheduled'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {mtg.status === 'completed' ? 'Selesai' : mtg.status === 'scheduled' ? 'Terjadwal' : 'Batal'}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{mtg.school_name}</h4>
                  <p className="text-xs font-semibold text-indigo-600 mt-0.5">{mtg.program_name}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <p className="font-bold text-slate-900 line-clamp-1">Materi: {mtg.topic_name}</p>
                  {mtg.practice_2 && mtg.practice_2 !== '-' ? (
                    <>
                      <p className="text-emerald-700 font-medium">Praktik 1: {mtg.practice_1}</p>
                      <p className="text-slate-600">Praktik 2: {mtg.practice_2}</p>
                    </>
                  ) : (
                    <p className="text-emerald-700 font-medium">Kegiatan Praktik: {mtg.practice_1}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{mtg.meeting_date} ({mtg.start_time})</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditModal(mtg, e)}
                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors"
                    title="Ubah Tanggal Pertemuan"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-indigo-600 flex items-center space-x-1 hover:underline">
                    <span>Presensi</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Date Modal */}
      {editingMeeting && (
        <Modal
          isOpen={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          title={`Ubah Tanggal Pertemuan #${editingMeeting.meeting_number}`}
        >
          <form onSubmit={handleSaveMeetingDate} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Pilih tanggal pertemuan baru jika tanggal awal bertabrakan dengan hari libur nasional atau tanggal merah.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-800">{editingMeeting.topic_name}</p>
              <p className="text-slate-500">Praktik: {editingMeeting.practice_1}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pertemuan</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Pertemuan</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="scheduled">Terjadwal (Scheduled)</option>
                <option value="completed">Selesai (Completed)</option>
                <option value="cancelled">Dibatalkan / Libur (Cancelled)</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Tanggal Baru'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
