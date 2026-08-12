import React, { useState, useEffect } from 'react';
import { Users, Plus, Upload, Download, Search, Edit2, CheckCircle, XCircle, Eye, Trash2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import { Student, School } from '../types';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';

interface StudentsPageProps {
  onSelectStudentDetail: (studentId: string) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ onSelectStudentDetail }) => {
  const { selectedSchoolId, schools, showToast } = useApp();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete & Duplicate Modals
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [cleanDuplicatesModalOpen, setCleanDuplicatesModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [studentNumber, setStudentNumber] = useState('');
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [className, setClassName] = useState('Kelas 4A');
  const [schoolId, setSchoolId] = useState(schools[0]?.id || 'sch-1');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Import State
  const [importSchoolId, setImportSchoolId] = useState(schools[0]?.id || 'sch-1');
  const [importedPreview, setImportedPreview] = useState<any[]>([]);

  useEffect(() => {
    loadStudents();
  }, [selectedSchoolId, search, classFilter]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const list = await apiService.getStudents({
        school_id: selectedSchoolId,
        search,
        class_name: classFilter
      });
      setStudents(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openStudentModal = (std?: Student) => {
    if (std) {
      setEditingStudent(std);
      setStudentNumber(std.student_number);
      setNisn(std.nisn || '');
      setFullName(std.full_name);
      setGender(std.gender);
      setClassName(std.class_name);
      setSchoolId(std.school_id);
      setParentName(std.parent_name || '');
      setParentPhone(std.parent_phone || '');
    } else {
      setEditingStudent(null);
      setStudentNumber(`2026${Math.floor(100 + Math.random() * 900)}`);
      setNisn('');
      setFullName('');
      setGender('L');
      setClassName('Kelas 4A');
      setSchoolId(selectedSchoolId !== 'all' ? selectedSchoolId : (schools[0]?.id || 'sch-1'));
      setParentName('');
      setParentPhone('');
    }
    setAddModalOpen(true);
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await apiService.updateStudent(editingStudent.id, {
          student_number: studentNumber,
          nisn,
          full_name: fullName,
          gender,
          class_name: className,
          school_id: schoolId,
          parent_name: parentName,
          parent_phone: parentPhone
        });
        showToast('Data siswa berhasil diperbarui.');
      } else {
        await apiService.createStudent({
          student_number: studentNumber,
          nisn,
          full_name: fullName,
          gender,
          class_name: className,
          school_id: schoolId,
          parent_name: parentName,
          parent_phone: parentPhone
        });
        showToast('Siswa baru berhasil ditambahkan.');
      }
      loadStudents();
      setAddModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data siswa.', 'error');
    }
  };

  // Excel File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Standardize keys
        const parsed = data.map((row: any) => ({
          student_number: row['NIS'] || row['student_number'] || row['nis'] || '',
          nisn: row['NISN'] || row['nisn'] || '',
          full_name: row['Nama Lengkap'] || row['full_name'] || row['Nama'] || '',
          gender: row['Jenis Kelamin'] || row['gender'] || row['L/P'] || 'L',
          class_name: row['Kelas'] || row['class_name'] || 'Kelas 4',
          parent_name: row['Orang Tua'] || row['parent_name'] || '',
          parent_phone: row['No Kontak'] || row['parent_phone'] || ''
        }));

        setImportedPreview(parsed);
      } catch (err) {
        showToast('Format file Excel tidak dapat dibaca.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importedPreview.length === 0) return;
    try {
      const res = await apiService.importStudents(importSchoolId, importedPreview);
      showToast(res.message);
      loadStudents();
      setImportModalOpen(false);
      setImportedPreview([]);
    } catch (err: any) {
      showToast('Gagal mengimpor siswa.', 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = students.map((std) => {
      const sch = schools.find(s => s.id === std.school_id);
      return {
        'NIS': std.student_number,
        'NISN': std.nisn,
        'Nama Lengkap': std.full_name,
        'Jenis Kelamin': std.gender,
        'Kelas': std.class_name,
        'Sekolah': sch?.name || '-',
        'Nama Orang Tua': std.parent_name,
        'No Kontak': std.parent_phone,
        'Status': std.is_active ? 'Aktif' : 'Non-aktif'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
    XLSX.writeFile(wb, `Daftar_Siswa_Ekstrakurikuler_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Data siswa berhasil diexport ke Excel.');
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleteLoading(true);
    try {
      await apiService.deleteStudent(studentToDelete.id);
      showToast('Data siswa berhasil dihapus.');
      setStudentToDelete(null);
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus siswa.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmCleanDuplicateStudents = async () => {
    setDeleteLoading(true);
    try {
      const res = await apiService.cleanDuplicateStudents();
      showToast(res.message);
      setCleanDuplicatesModalOpen(false);
      loadStudents();
    } catch (err: any) {
      showToast('Gagal membersihkan siswa duplikat.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Modul Kelola Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">
            Total {students.length} siswa terdaftar untuk program ekstrakurikuler.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCleanDuplicatesModalOpen(true)}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
            title="Bersihkan Siswa Duplikat"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Bersihkan Duplikat</span>
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => openStudentModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama lengkap, NIS, atau NISN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">Semua Kelas</option>
          <option value="Kelas 4">Kelas 4</option>
          <option value="Kelas 4A">Kelas 4A</option>
          <option value="Kelas 5">Kelas 5</option>
          <option value="Kelas 5A">Kelas 5A</option>
          <option value="Kelas 5B">Kelas 5B</option>
          <option value="Kelas 6">Kelas 6</option>
          <option value="Kelas 6A">Kelas 6A</option>
        </select>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">NIS / NISN</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">L/P</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4">Sekolah</th>
                <th className="py-3.5 px-4">Orang Tua / HP</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {students.map((std, idx) => {
                const sch = schools.find(s => s.id === std.school_id);
                return (
                  <tr key={std.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{std.student_number}</div>
                      {std.nisn && <div className="text-[10px] text-slate-400 font-normal">{std.nisn}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{std.full_name}</td>
                    <td className="py-3.5 px-4">{std.gender}</td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-700">{std.class_name}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{sch?.name || '-'}</td>
                    <td className="py-3.5 px-4">{std.parent_name || '-'} ({std.parent_phone || '-'})</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectStudentDetail(std.id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold flex items-center space-x-1"
                          title="Lihat Histori & Rapor Siswa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStudentModal(std)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(std)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
      >
        <form onSubmit={handleSubmitStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">NIS (Nomor Induk Siswa)</label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">NISN (Opsional)</label>
              <input
                type="text"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Contoh: Ahmad Rizky"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                placeholder="Contoh: Kelas 4A"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sekolah</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">No Kontak Orang Tua</label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Simpan Data Siswa
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Data Siswa dari Excel"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pilih Sekolah Tujuan</label>
            <select
              value={importSchoolId}
              onChange={(e) => setImportSchoolId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-700">Pilih file spreadsheet (.xlsx / .csv)</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Kolom wajib: NIS, Nama Lengkap, Kelas</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {importedPreview.length > 0 && (
            <div className="space-y-2">
              <p className="font-bold text-emerald-700">Preview Data ({importedPreview.length} siswa ditemukan):</p>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                    <tr>
                      <th className="p-2">NIS</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importedPreview.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2">{item.student_number}</td>
                        <td className="p-2 font-bold">{item.full_name}</td>
                        <td className="p-2">{item.class_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importedPreview.length === 0}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              Konfirmasi Import ({importedPreview.length} Siswa)
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Single Student Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        title="Hapus Data Siswa"
        message="Apakah Anda yakin ingin menghapus data siswa ini? Semua riwayat presensi, pretest, dan nilai praktik siswa juga akan dihapus permanen."
        itemName={studentToDelete ? `${studentToDelete.full_name} (${studentToDelete.student_number})` : ''}
        loading={deleteLoading}
      />

      {/* Clean Duplicates Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={cleanDuplicatesModalOpen}
        onClose={() => setCleanDuplicatesModalOpen(false)}
        onConfirm={confirmCleanDuplicateStudents}
        title="Bersihkan Siswa Duplikat"
        message="Sistem akan mendeteksi dan menghapus siswa ganda berdasarkan kombinasi NIS atau Nama di sekolah yang sama."
        loading={deleteLoading}
      />
    </div>
  );
};
