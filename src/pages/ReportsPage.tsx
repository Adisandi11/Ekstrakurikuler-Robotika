import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Filter, Award, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';

export const ReportsPage: React.FC = () => {
  const { selectedSchoolId, schools, activeSemester, showToast } = useApp();
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'summary' | 'attendance' | 'assessment'>('summary');

  useEffect(() => {
    loadReport();
  }, [selectedSchoolId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await apiService.getReportSummary(selectedSchoolId, activeSemester?.id);
      setReportRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = reportRows.map(r => ({
      'NIS': r.student_number,
      'Nama Siswa': r.full_name,
      'Sekolah': r.school_name,
      'Kelas': r.class_name,
      'Hadir': r.attendance.hadir,
      'Izin': r.attendance.izin,
      'Sakit': r.attendance.sakit,
      'Alpha': r.attendance.alpha,
      'Kehadiran (%)': `${r.attendance.percentage}%`,
      'Rata Pretest': r.pretest.average,
      'Rata Praktik': r.practice.average,
      'Predikat Praktik': r.practice.predicate
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Ekstrakurikuler');
    XLSX.writeFile(wb, `Laporan_Ekstrakurikuler_Robotika_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Laporan berhasil diexport ke Excel.');
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('LAPORAN EKSTRAKURIKULER ROBOTIKA & CODING SD', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran 2026/2027 - ${activeSemester?.name || 'Semester 1'}`, 14, 22);

    const tableHeaders = [['NIS', 'Nama Siswa', 'Sekolah', 'Kelas', 'Hadir', 'Pretest', 'Praktik', 'Predikat']];
    const tableBody = reportRows.map(r => [
      r.student_number,
      r.full_name,
      r.school_name,
      r.class_name,
      `${r.attendance.percentage}%`,
      r.pretest.average,
      r.practice.average,
      r.practice.predicate
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 }
    });

    doc.save(`Laporan_Rapor_Robotika_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Dokumen PDF berhasil didownload.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Rekapitulasi & Laporan Rapor</h2>
          <p className="text-xs text-slate-500 mt-1">Laporan kehadiran, rata-rata pretest, dan penilaian praktik kualitatif siswa.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleGeneratePDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Rapor</span>
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">NIS</th>
                <th className="py-3.5 px-4">Nama Siswa</th>
                <th className="py-3.5 px-4">Sekolah</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4 text-center">Kehadiran</th>
                <th className="py-3.5 px-4 text-center">Rata Pretest</th>
                <th className="py-3.5 px-4 text-center">Rata Praktik</th>
                <th className="py-3.5 px-4">Predikat Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {reportRows.map((r, idx) => (
                <tr key={r.student_id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.student_number}</td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">{r.full_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{r.school_name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{r.class_name}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-extrabold text-indigo-700">{r.attendance.percentage}%</span>
                    <div className="text-[10px] text-slate-400">H:{r.attendance.hadir} I:{r.attendance.izin} S:{r.attendance.sakit} A:{r.attendance.alpha}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{r.pretest.average}</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700">{r.practice.average}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-extrabold rounded-lg border border-indigo-100 text-[11px]">
                      {r.practice.predicate}
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
