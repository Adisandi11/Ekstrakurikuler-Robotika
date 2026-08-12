import React, { useState, useEffect } from 'react';
import {
  School as SchoolIcon, Users, Calendar, CheckCircle2,
  Clock, TrendingUp, Award, ArrowRight, Activity, Bot
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { DashboardStats } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string, schoolId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, selectedSchoolId, activeAcademicYear, activeSemester } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedSchoolId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDashboardStats(selectedSchoolId);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-semibold mb-3">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tahun Ajaran {activeAcademicYear?.name || '2026/2027'} &bull; {activeSemester?.name || 'Semester 1'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat datang, {user?.name || 'Admin'}! 👋
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Kelola kegiatan ekstrakurikuler Robotika dan Coding secara terpusat untuk semua Sekolah Dasar. Pantau kehadiran, materi, dan perkembangan nilai praktik siswa.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => onNavigate('meetings')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              <span>Lihat Pertemuan Mingguan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700"
            >
              Kelola Siswa
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Sekolah */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Sekolah</span>
            <SchoolIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_schools}</p>
          <p className="text-[11px] text-slate-500 mt-1">Aktif terdaftar</p>
        </div>

        {/* Card 2: Siswa */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Siswa</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_students}</p>
          <p className="text-[11px] text-slate-500 mt-1">Siswa peserta</p>
        </div>

        {/* Card 3: Total Pertemuan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Pertemuan</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_semester_meetings}</p>
          <p className="text-[11px] text-slate-500 mt-1">Total semester</p>
        </div>

        {/* Card 4: Selesai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.completed_meetings}</p>
          <p className="text-[11px] text-slate-500 mt-1">Terlaksana</p>
        </div>

        {/* Card 5: Kehadiran */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Kehadiran</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.attendance_percentage}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Rata-rata presensi</p>
        </div>

        {/* Card 6: Nilai Praktik */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Rata Nilai</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.average_practice_score}</p>
          <p className="text-[11px] text-slate-500 mt-1">Skor praktik</p>
        </div>
      </div>

      {/* Middle Section: School Progress & Upcoming Meeting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Progress Bars */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">Progres Program Per Sekolah</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cakupan pertemuan silabus Semester 1 (Robot Dasar & LEGO WeDo)</p>
            </div>
            <button
              onClick={() => onNavigate('schools')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Lihat Detail &rarr;
            </button>
          </div>

          <div className="space-y-6">
            {stats.school_progress.map((sch) => (
              <div key={sch.school_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-slate-800">{sch.school_name}</span>
                  <button
                    onClick={() => onNavigate('meetings', sch.school_id)}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Buka Pertemuan
                  </button>
                </div>

                <div className="space-y-3">
                  {sch.programs.map((prog, pIdx) => {
                    const percent = Math.round((prog.completed / prog.total) * 100);
                    return (
                      <div key={pIdx}>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>{prog.program_name}</span>
                          <span>{prog.completed} / {prog.total} Pertemuan ({percent}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pIdx === 0 ? 'bg-indigo-600' : 'bg-purple-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Meeting Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 mb-4">
              <Clock className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-800">Pertemuan Berikutnya</h3>
            </div>

            {stats.upcoming_meeting ? (
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    Pertemuan #{stats.upcoming_meeting.meeting_number}
                  </span>
                  <span className="text-xs font-semibold text-indigo-800">{stats.upcoming_meeting.date}</span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-2">{stats.upcoming_meeting.school_name}</h4>
                <p className="text-xs font-medium text-slate-600 mt-1">
                  Hari {stats.upcoming_meeting.day_of_week} ({stats.upcoming_meeting.time})
                </p>
                <div className="mt-3 pt-3 border-t border-indigo-100/80">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Materi Pembelajaran:</p>
                  <p className="text-xs font-bold text-indigo-950 mt-0.5">{stats.upcoming_meeting.topic_name}</p>
                </div>
                <button
                  onClick={() => onNavigate('meetings')}
                  className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Buka Presensi & Penilaian
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Belum ada jadwal pertemuan mendatang.
              </div>
            )}
          </div>

          {/* Quick Schedule Reference */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Jadwal Rutin Ekstrakurikuler</h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <span className="font-bold text-slate-800">SDIT RMK</span>
                <span className="font-semibold text-indigo-600">Jumat 13:00–14:30</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <span className="font-bold text-slate-800">SDN 1 Darma</span>
                <span className="font-semibold text-indigo-600">Senin 13:00–14:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Feed - Super Admin Only */}
      {user?.role === 'superadmin' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <h3 className="text-base font-bold text-slate-800">Aktivitas Terakhir</h3>
            </div>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Semua Log &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recent_activities.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{log.user_name}</span>
                  <span className="text-slate-500 mx-1.5">&bull;</span>
                  <span className="font-semibold text-indigo-600">{log.action}</span>
                  <p className="text-slate-600 mt-0.5">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 ml-4">
                  {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
