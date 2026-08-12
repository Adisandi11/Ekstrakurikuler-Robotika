import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, Save, UserCheck, Award, FileText,
  Calendar, Clock, Check, Plus, Image as ImageIcon, Edit3
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  Meeting, Student, Attendance, PretestScore, PracticeAssessment,
  PracticeRating, AttendanceStatus
} from '../types';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';

interface MeetingDetailPageProps {
  meetingId: string;
  onBack: () => void;
}

export const MeetingDetailPage: React.FC<MeetingDetailPageProps> = ({ meetingId, onBack }) => {
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'pretest' | 'practice' | 'notes' | 'doc'>('attendance');
  const { showToast } = useApp();

  // Local Form States
  const [attendancesState, setAttendancesState] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [pretestsState, setPretestsState] = useState<Record<string, number | null>>({});
  const [practiceState, setPracticeState] = useState<Record<string, {
    instruction: PracticeRating;
    accuracy: PracticeRating;
    functionRating: PracticeRating;
    neatness: PracticeRating;
  }>>({});

  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');

  // Date edit modal state
  const [editDateModalOpen, setEditDateModalOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('13:00');
  const [editEndTime, setEditEndTime] = useState('14:30');
  const [editStatus, setEditStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const [editDateLoading, setEditDateLoading] = useState(false);

  useEffect(() => {
    loadMeetingDetail();
  }, [meetingId]);

  const loadMeetingDetail = async () => {
    setLoading(true);
    try {
      const data = await apiService.getMeetingDetail(meetingId);
      setMeeting(data);

      setEditDate(data.meeting_date || '');
      setEditStartTime(data.start_time || '13:00');
      setEditEndTime(data.end_time || '14:30');
      setEditStatus(data.status || 'scheduled');

      // Initialize Attendance State
      const attMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
      data.students.forEach((s: Student) => {
        const existing = data.attendances.find((a: Attendance) => a.student_id === s.id);
        attMap[s.id] = {
          status: existing ? existing.status : 'hadir',
          notes: existing ? (existing.notes || '') : ''
        };
      });
      setAttendancesState(attMap);

      // Initialize Pretest State
      const preMap: Record<string, number | null> = {};
      data.students.forEach((s: Student) => {
        const existing = data.pretestScores.find((p: PretestScore) => p.student_id === s.id);
        preMap[s.id] = existing && existing.score !== null ? existing.score : null;
      });
      setPretestsState(preMap);

      // Initialize Practice State
      const praMap: Record<string, { instruction: PracticeRating; accuracy: PracticeRating; functionRating: PracticeRating; neatness: PracticeRating }> = {};
      data.students.forEach((s: Student) => {
        const existing = data.practiceAssessments.find((p: PracticeAssessment) => p.student_id === s.id);
        praMap[s.id] = {
          instruction: existing ? existing.instruction_rating : 'B',
          accuracy: existing ? existing.assembly_accuracy_rating : 'B',
          functionRating: existing ? existing.robot_function_rating : 'B',
          neatness: existing ? existing.neatness_part_rating : 'B'
        };
      });
      setPracticeState(praMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for Practice Calculation Formula
  const calcRowScore = (ratings: { instruction: PracticeRating; accuracy: PracticeRating; functionRating: PracticeRating; neatness: PracticeRating }) => {
    const weights: Record<PracticeRating, number> = { SB: 25, B: 20, C: 15, PB: 10 };
    const total = weights[ratings.instruction] + weights[ratings.accuracy] + weights[ratings.functionRating] + weights[ratings.neatness];
    let predicate = 'Perlu Bimbingan';
    if (total >= 90) predicate = 'Sangat Baik';
    else if (total >= 75) predicate = 'Baik';
    else if (total >= 60) predicate = 'Cukup';

    return { total, predicate };
  };

  // Bulk Mark All Present
  const handleMarkAllPresent = () => {
    const updated = { ...attendancesState };
    Object.keys(updated).forEach(id => {
      updated[id].status = 'hadir';
    });
    setAttendancesState(updated);
    showToast('Seluruh siswa ditandai Hadir.');
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(attendancesState).map(([student_id, val]: [string, { status: AttendanceStatus; notes: string }]) => ({
        student_id,
        status: val.status,
        notes: val.notes
      }));
      await apiService.saveAttendance(meetingId, payload);
      // Mark meeting completed
      await apiService.updateMeeting(meetingId, { status: 'completed' });
      showToast('Absensi berhasil disimpan dan status pertemuan diperbarui.');
      loadMeetingDetail();
    } catch (err: any) {
      showToast('Gagal menyimpan absensi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Pretest
  const handleSavePretest = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(pretestsState).map(([student_id, score]) => ({
        student_id,
        score: score !== null ? Number(score) : null
      }));
      await apiService.savePretest(meetingId, payload);
      showToast('Nilai pretest berhasil disimpan.');
      loadMeetingDetail();
    } catch (err: any) {
      showToast('Gagal menyimpan nilai pretest.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Practice
  const handleSavePractice = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(practiceState).map(([student_id, r]: [string, { instruction: PracticeRating; accuracy: PracticeRating; functionRating: PracticeRating; neatness: PracticeRating }]) => ({
        student_id,
        instruction_rating: r.instruction,
        assembly_accuracy_rating: r.accuracy,
        robot_function_rating: r.functionRating,
        neatness_part_rating: r.neatness
      }));
      await apiService.savePracticeAssessments(meetingId, payload);
      showToast('Nilai praktik berhasil dihitung dan disimpan.');
      loadMeetingDetail();
    } catch (err: any) {
      showToast('Gagal menyimpan nilai praktik.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote) return;
    try {
      await apiService.addMeetingNote(meetingId, newNote);
      setNewNote('');
      showToast('Catatan pembelajaran disimpan.');
      loadMeetingDetail();
    } catch (err: any) {
      showToast('Gagal menambah catatan.', 'error');
    }
  };

  const handleAddDoc = async () => {
    if (!docTitle || !docUrl) return;
    try {
      await apiService.addMeetingDocumentation(meetingId, docTitle, docUrl);
      setDocTitle('');
      setDocUrl('');
      showToast('Foto dokumentasi berhasil disimpan.');
      loadMeetingDetail();
    } catch (err: any) {
      showToast('Gagal menyimpan foto dokumentasi.', 'error');
    }
  };

  const handleSaveMeetingDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditDateLoading(true);
    try {
      await apiService.updateMeeting(meetingId, {
        meeting_date: editDate,
        start_time: editStartTime,
        end_time: editEndTime,
        status: editStatus
      });
      showToast('Tanggal dan jadwal pertemuan berhasil diperbarui.');
      setEditDateModalOpen(false);
      loadMeetingDetail();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah tanggal pertemuan.', 'error');
    } finally {
      setEditDateLoading(false);
    }
  };

  if (loading || !meeting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const students: Student[] = meeting.students || [];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase">
              Pertemuan #{meeting.meeting_number}
            </span>
            <span className="text-xs font-bold text-slate-500">{meeting.school_name} ({meeting.day_of_week})</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">{meeting.topic_name}</h2>
        </div>
      </div>

      {/* Meeting Context Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">
        <div>
          <span className="text-slate-400 font-semibold block">Program / Silabus:</span>
          <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{meeting.program_name}</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold block">
            {meeting.program_name.toLowerCase().includes('scratch') || !meeting.practice_2 || meeting.practice_2 === '-' ? 'Kegiatan Praktik:' : 'Proyek Praktik:'}
          </span>
          <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
            {meeting.practice_2 && meeting.practice_2 !== '-' ? `1. ${meeting.practice_1} | 2. ${meeting.practice_2}` : meeting.practice_1}
          </span>
        </div>
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div>
            <span className="text-slate-400 font-semibold block">Waktu Pelaksanaan:</span>
            <span className="font-bold text-slate-800 text-sm block">{meeting.meeting_date} ({meeting.start_time}–{meeting.end_time} WIB)</span>
          </div>
          <button
            type="button"
            onClick={() => setEditDateModalOpen(true)}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center space-x-1 shrink-0"
            title="Ubah Tanggal Pertemuan"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Ubah</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'attendance', label: '1. Absensi', icon: UserCheck },
          { id: 'pretest', label: '2. Pretest', icon: FileText },
          { id: 'practice', label: '3. Penilaian Praktik', icon: Award },
          { id: 'overview', label: 'Materi Silabus', icon: CheckCircle2 },
          { id: 'notes', label: 'Catatan & Doc', icon: ImageIcon }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">Presensi Kehadiran Siswa ({students.length})</h3>
              <p className="text-xs text-slate-500">Tandai status kehadiran seluruh peserta kelas.</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
              >
                Tandai Semua Hadir
              </button>

              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Presensi</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4 text-center">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {students.map((std, idx) => {
                  const currStatus = attendancesState[std.id]?.status || 'hadir';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{std.student_number}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{std.full_name}</td>
                      <td className="py-3 px-4">{std.class_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          {(['hadir', 'izin', 'sakit', 'alpha'] as AttendanceStatus[]).map(st => (
                            <button
                              key={st}
                              onClick={() => {
                                setAttendancesState(prev => ({
                                  ...prev,
                                  [std.id]: { ...prev[std.id], status: st }
                                }));
                              }}
                              className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition-all ${
                                currStatus === st
                                  ? st === 'hadir' ? 'bg-emerald-600 text-white shadow-xs'
                                    : st === 'izin' ? 'bg-blue-600 text-white shadow-xs'
                                    : st === 'sakit' ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRETEST */}
      {activeTab === 'pretest' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Nilai Pretest Pertemuan (#{meeting.meeting_number})</h3>
              <p className="text-xs text-slate-500">Input nilai pretest awal setiap pertemuan (Skala 0-100).</p>
            </div>
            <button
              onClick={handleSavePretest}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pretest</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Skor Pretest (0-100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {students.map((std, idx) => {
                  const scoreVal = pretestsState[std.id];
                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{std.full_name}</td>
                      <td className="py-3 px-4">{std.class_name}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={scoreVal !== null && scoreVal !== undefined ? scoreVal : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            setPretestsState(prev => ({ ...prev, [std.id]: val }));
                          }}
                          placeholder="Nilai pretest"
                          className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRACTICE ASSESSMENT */}
      {activeTab === 'practice' && (
        <div className="space-y-6">
          {/* Assessment Legend Banner */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-2 text-xs">
            <h4 className="font-extrabold text-sm text-indigo-300">Skema & Legenda Penilaian Praktik Robotika</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                <span className="font-extrabold text-emerald-400">SB = Sangat Baik</span>
                <p className="text-[11px] text-slate-300">25 Poin</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                <span className="font-extrabold text-blue-400">B = Baik</span>
                <p className="text-[11px] text-slate-300">20 Poin</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                <span className="font-extrabold text-amber-400">C = Cukup</span>
                <p className="text-[11px] text-slate-300">15 Poin</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                <span className="font-extrabold text-rose-400">PB = Perlu Bimbingan</span>
                <p className="text-[11px] text-slate-300">10 Poin</p>
              </div>
            </div>
          </div>

          {/* Assessment Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Form Input Penilaian Praktik Robotika</h3>
                <p className="text-xs text-slate-500">Pilih 4 kriteria penilaian. Total & Predikat dihitung secara otomatis.</p>
              </div>

              <button
                onClick={handleSavePractice}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Penilaian Praktik</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3.5 px-3">No</th>
                    <th className="py-3.5 px-3">Nama Siswa</th>
                    <th className="py-3.5 px-3">Kelas</th>
                    <th className="py-3.5 px-3">Mengikuti Instruksi</th>
                    <th className="py-3.5 px-3">Ketelitian Merakit</th>
                    <th className="py-3.5 px-3">Robot Berfungsi</th>
                    <th className="py-3.5 px-3">Kerapihan & Part</th>
                    <th className="py-3.5 px-3 text-center">Total</th>
                    <th className="py-3.5 px-3">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {students.map((std, idx) => {
                    const r = practiceState[std.id] || { instruction: 'B', accuracy: 'B', functionRating: 'B', neatness: 'B' };
                    const { total, predicate } = calcRowScore(r);

                    return (
                      <tr key={std.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">{std.full_name}</td>
                        <td className="py-3 px-3 text-slate-500">{std.class_name}</td>

                        {/* Criteria 1 */}
                        <td className="py-3 px-3">
                          <select
                            value={r.instruction}
                            onChange={(e) => {
                              const val = e.target.value as PracticeRating;
                              setPracticeState(prev => ({ ...prev, [std.id]: { ...r, instruction: val } }));
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-extrabold text-slate-800"
                          >
                            <option value="SB">SB (25)</option>
                            <option value="B">B (20)</option>
                            <option value="C">C (15)</option>
                            <option value="PB">PB (10)</option>
                          </select>
                        </td>

                        {/* Criteria 2 */}
                        <td className="py-3 px-3">
                          <select
                            value={r.accuracy}
                            onChange={(e) => {
                              const val = e.target.value as PracticeRating;
                              setPracticeState(prev => ({ ...prev, [std.id]: { ...r, accuracy: val } }));
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-extrabold text-slate-800"
                          >
                            <option value="SB">SB (25)</option>
                            <option value="B">B (20)</option>
                            <option value="C">C (15)</option>
                            <option value="PB">PB (10)</option>
                          </select>
                        </td>

                        {/* Criteria 3 */}
                        <td className="py-3 px-3">
                          <select
                            value={r.functionRating}
                            onChange={(e) => {
                              const val = e.target.value as PracticeRating;
                              setPracticeState(prev => ({ ...prev, [std.id]: { ...r, functionRating: val } }));
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-extrabold text-slate-800"
                          >
                            <option value="SB">SB (25)</option>
                            <option value="B">B (20)</option>
                            <option value="C">C (15)</option>
                            <option value="PB">PB (10)</option>
                          </select>
                        </td>

                        {/* Criteria 4 */}
                        <td className="py-3 px-3">
                          <select
                            value={r.neatness}
                            onChange={(e) => {
                              const val = e.target.value as PracticeRating;
                              setPracticeState(prev => ({ ...prev, [std.id]: { ...r, neatness: val } }));
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-extrabold text-slate-800"
                          >
                            <option value="SB">SB (25)</option>
                            <option value="B">B (20)</option>
                            <option value="C">C (15)</option>
                            <option value="PB">PB (10)</option>
                          </select>
                        </td>

                        {/* Calculated Total */}
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 bg-indigo-50 font-extrabold text-indigo-900 rounded-lg border border-indigo-100">
                            {total}
                          </span>
                        </td>

                        {/* Calculated Predicate */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            predicate === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {predicate}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OVERVIEW SILABUS */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
          <h3 className="text-base font-bold text-slate-800">Detail Materi Pembelajaran</h3>
          <div className="p-4 bg-slate-50 rounded-xl space-y-2">
            <p><strong>Materi Utama:</strong> {meeting.topic_name}</p>
            <p><strong>Praktik Robot 1:</strong> {meeting.practice_1}</p>
            <p><strong>Praktik Robot 2:</strong> {meeting.practice_2 || '-'}</p>
            <p><strong>Hasil Belajar Target:</strong> {meeting.learning_outcome}</p>
          </div>
        </div>
      )}

      {/* TAB 5: NOTES & DOC */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800">Catatan Pembelajaran Instruktur</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Tulis catatan kelas (misal: Budi sangat mahir merakit gear)..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
              <button
                onClick={handleAddNote}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shrink-0"
              >
                Simpan Catatan
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {meeting.notes?.map((n: any) => (
                <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <p className="font-bold text-slate-800">{n.note_text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Ditulis oleh {n.created_by}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documentation Photos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800">Foto Dokumentasi Kegiatan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Judul foto (misal: Foto Hasil Rakitan Crocodile)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
              <input
                type="url"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="URL Gambar (https://...)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <button
              onClick={handleAddDoc}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Tambah Foto Dokumentasi
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              {meeting.documentations?.map((d: any) => (
                <div key={d.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={d.file_url} alt={d.title} className="w-full h-32 object-cover" />
                  <p className="p-2 text-xs font-bold text-slate-800 truncate">{d.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Date Edit Modal */}
      <Modal
        isOpen={editDateModalOpen}
        onClose={() => setEditDateModalOpen(false)}
        title={`Ubah Tanggal Pertemuan #${meeting.meeting_number}`}
      >
        <form onSubmit={handleSaveMeetingDate} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Anda dapat menentukan tanggal pelaksanaan pertemuan secara bebas untuk mengantisipasi tanggal merah / libur sekolah.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <p className="font-bold text-slate-800">{meeting.topic_name}</p>
            <p className="text-slate-500">Proyek: {meeting.practice_1}</p>
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
              onClick={() => setEditDateModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editDateLoading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {editDateLoading ? 'Menyimpan...' : 'Simpan Tanggal Baru'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
