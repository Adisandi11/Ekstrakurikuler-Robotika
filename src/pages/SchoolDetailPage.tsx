import React, { useState, useEffect } from 'react';
import { School as SchoolIcon, Calendar, Clock, MapPin, Users, CheckCircle2, Award, ArrowLeft, Plus } from 'lucide-react';
import { apiService } from '../services/api';
import { School, Student, Meeting } from '../types';

interface SchoolDetailPageProps {
  schoolId: string;
  onBack: () => void;
  onNavigate: (tab: string, schoolId?: string) => void;
}

export const SchoolDetailPage: React.FC<SchoolDetailPageProps> = ({ schoolId, onBack, onNavigate }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sch, stds, mtgs] = await Promise.all([
        apiService.getSchool(schoolId),
        apiService.getStudents({ school_id: schoolId }),
        apiService.getMeetings({ school_id: schoolId })
      ]);
      setSchool(sch);
      setStudents(stds);
      setMeetings(mtgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !school) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const completedCount = meetings.filter(m => m.status === 'completed').length;
  const progressPercent = meetings.length > 0 ? Math.round((completedCount / meetings.length) * 100) : 0;

  const robotDasarMtgs = meetings.filter(m => m.program_id === 'prog-robot-dasar');
  const legoWedoMtgs = meetings.filter(m => m.program_id === 'prog-lego-wedo');

  return (
    <div className="space-y-6">
      {/* Back Button & Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{school.name}</h2>
          <p className="text-xs text-slate-500">Profil & Rekapitulasi Sekolah Ekstrakurikuler</p>
        </div>
      </div>

      {/* Hero School Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0">
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="w-full h-full object-cover" />
            ) : (
              <SchoolIcon className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">{school.name}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{school.address || 'Alamat tidak tersedia'}</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Hari {school.day_of_week}</span>
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{school.start_time} – {school.end_time} WIB</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Siswa</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{students.length} orang</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Progres Pertemuan</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{completedCount} / {meetings.length || 24}</p>
          </div>
        </div>
      </div>

      {/* Program Progress Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-800">Progres Program Semester 1</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-slate-800">1. Ekstrakurikuler Robot Dasar</span>
              <span className="text-xs font-bold text-indigo-600">
                {robotDasarMtgs.filter(m => m.status === 'completed').length} / 12 Selesai
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${(robotDasarMtgs.filter(m => m.status === 'completed').length / 12) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-slate-800">2. Robotika & Coding LEGO WeDo</span>
              <span className="text-xs font-bold text-purple-600">
                {legoWedoMtgs.filter(m => m.status === 'completed').length} / 12 Selesai
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{ width: `${(legoWedoMtgs.filter(m => m.status === 'completed').length / 12) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students List in School */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Daftar Siswa Peserta ({students.length})</h3>
            <p className="text-xs text-slate-500">Siswa yang terdaftar di {school.name}</p>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kelola Siswa</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Orang Tua / Kontak</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {students.map((std, idx) => (
                <tr key={std.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{std.student_number}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{std.full_name}</td>
                  <td className="py-3 px-4">{std.gender}</td>
                  <td className="py-3 px-4">{std.class_name}</td>
                  <td className="py-3 px-4">{std.parent_name || '-'} ({std.parent_phone || '-'})</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
