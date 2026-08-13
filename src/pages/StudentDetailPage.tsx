import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../services/api';
import { Attendance, PretestScore, PracticeAssessment } from '../types';
import { useApp } from '../context/AppContext';

interface StudentDetailPageProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({ studentId, onBack }) => {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useApp();

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const data = await apiService.getStudentDetail(studentId);
      setStudent(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const attendances: Attendance[] = student.attendances || [];
  const pretestScores: PretestScore[] = student.pretestScores || [];
  const practiceAssessments: PracticeAssessment[] = student.practiceAssessments || [];

  const hadirCount = attendances.filter(a => a.status === 'hadir').length;
  const izinCount = attendances.filter(a => a.status === 'izin').length;
  const sakitCount = attendances.filter(a => a.status === 'sakit').length;
  const alphaCount = attendances.filter(a => a.status === 'alpha').length;

  const handleExportExcel = () => {
    if (!student) return;

    const headerInfo = [
      { 'Pertemuan': 'NAMA SISWA', 'Status Presensi': student.full_name },
      { 'Pertemuan': 'NIS', 'Status Presensi': student.student_number },
      { 'Pertemuan': 'KELAS', 'Status Presensi': student.class_name },
      { 'Pertemuan': 'SEKOLAH', 'Status Presensi': student.school_name || '-' },
      { 'Pertemuan': 'RINGKASAN KEHADIRAN', 'Status Presensi': `Hadir: ${hadirCount}, Izin: ${izinCount}, Sakit: ${sakitCount}, Alpha: ${alphaCount}` },
      { 'Pertemuan': '', 'Status Presensi': '' }
    ];

    const meetingRows = Array.from({ length: 24 }).map((_, i) => {
      const meetingNum = i + 1;
      const att = attendances[i];
      const pts = pretestScores[i];
      const pra = practiceAssessments[i];

      return {
        'Pertemuan': `Pertemuan #${meetingNum}`,
        'Status Presensi': att ? att.status.toUpperCase() : 'Belum Terlaksana',
        'Nilai Pretest': pts?.score !== null && pts?.score !== undefined ? pts.score : '-',
        'Nilai Praktik Total': pra?.total_score !== undefined ? pra.total_score : '-',
        'Predikat Praktik': pra?.predicate || '-'
      };
    });

    const exportData = [...headerInfo, ...meetingRows];
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 20 },
      { wch: 22 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histori & Raport');

    const sanitizedName = student.full_name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Raport_Siswa_${sanitizedName}.xlsx`);
    showToast('Histori dan Raport siswa berhasil diexport ke Excel.');
  };

  const handleExportPDF = () => {
    if (!student) return;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPORT INDIVIDUAL EKSTRAKURIKULER ROBOTIKA & CODING', 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sekolah: ${student.school_name || '-'}`, 14, 23);
    doc.text(`Nama Siswa: ${student.full_name}`, 14, 29);
    doc.text(`NIS: ${student.student_number}  |  Kelas: ${student.class_name}`, 14, 35);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ringkasan Kehadiran: Hadir (${hadirCount}) | Izin (${izinCount}) | Sakit (${sakitCount}) | Alpha (${alphaCount})`, 14, 43);

    const tableHeaders = [['Pertemuan', 'Status Presensi', 'Nilai Pretest', 'Nilai Praktik Total', 'Predikat Praktik']];
    const tableBody = Array.from({ length: 24 }).map((_, i) => {
      const meetingNum = i + 1;
      const att = attendances[i];
      const pts = pretestScores[i];
      const pra = practiceAssessments[i];

      return [
        `Pertemuan #${meetingNum}`,
        att ? att.status.toUpperCase() : 'Belum terlaksana',
        pts?.score !== null && pts?.score !== undefined ? pts.score : '-',
        pra?.total_score !== undefined ? pra.total_score : '-',
        pra?.predicate || '-'
      ];
    });

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 48,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    const sanitizedName = student.full_name.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Raport_Siswa_${sanitizedName}.pdf`);
    showToast('Raport PDF berhasil didownload.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{student.full_name}</h2>
            <p className="text-xs text-slate-500">
              Histori Kehadiran & Rekam Perkembangan Akademik Siswa
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Student Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center space-x-4 md:col-span-1">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl shrink-0">
            {student.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{student.full_name}</h3>
            <p className="text-xs font-semibold text-indigo-600">NIS: {student.student_number} &bull; {student.class_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{student.school_name}</p>
          </div>
        </div>

        {/* Attendance Stats Pills */}
        <div className="md:col-span-2 grid grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-800">Hadir</span>
            <p className="text-xl font-extrabold text-emerald-900 mt-0.5">{hadirCount}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-center">
            <span className="text-[10px] font-bold uppercase text-blue-800">Izin</span>
            <p className="text-xl font-extrabold text-blue-900 mt-0.5">{izinCount}</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-center">
            <span className="text-[10px] font-bold uppercase text-amber-800">Sakit</span>
            <p className="text-xl font-extrabold text-amber-900 mt-0.5">{sakitCount}</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-center">
            <span className="text-[10px] font-bold uppercase text-rose-800">Alpha</span>
            <p className="text-xl font-extrabold text-rose-900 mt-0.5">{alphaCount}</p>
          </div>
        </div>
      </div>

      {/* Assessment Progression Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-800">Perkembangan Nilai Pertemuan Ke Pertemuan</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Pertemuan</th>
                <th className="py-3 px-4">Status Presensi</th>
                <th className="py-3 px-4">Nilai Pretest</th>
                <th className="py-3 px-4">Nilai Praktik Total</th>
                <th className="py-3 px-4">Predikat Praktik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {Array.from({ length: 24 }).map((_, i) => {
                const meetingNum = i + 1;
                const att = attendances[i];
                const pts = pretestScores[i];
                const pra = practiceAssessments[i];

                return (
                  <tr key={meetingNum} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Pertemuan #{meetingNum}</td>
                    <td className="py-3 px-4">
                      {att ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          att.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {att.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Belum terlaksana</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{pts?.score !== null && pts?.score !== undefined ? pts.score : '-'}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{pra?.total_score !== undefined ? pra.total_score : '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{pra?.predicate || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

