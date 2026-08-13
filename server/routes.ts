import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, calculatePracticeAssessment } from './db';
import { firestore } from './firebase';
import {
  User, School, AcademicYear, Semester, Program, ProgramSession,
  Student, Meeting, Attendance, PracticeAssessment, PretestScore,
  PracticeRating, AttendanceStatus, MeetingStatus
} from '../src/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-robotics-coding-2026';

// Check Firebase Firestore connection status
router.get('/firebase-status', (req: Request, res: Response) => {
  res.json({
    connected: !!firestore,
    projectId: 'glassy-crossbar-tt8c4',
    databaseId: 'ai-studio-sistemekstrakuri-93f064cc-29b0-42f5-a110-dcd07fb8859e'
  });
});

// Middleware to ensure DB initial sync with Firestore completes before processing requests
router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.ensureSynced();
  } catch (err) {
    console.error('Error waiting for DB sync:', err);
  }
  next();
});

// Middleware Authentication
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Sesi telah berakhir or token tidak valid.' });
  }
}

export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'superadmin') {
    res.status(403).json({ message: 'Akses ditolak. Hanya Super Admin yang memiliki akses.' });
    return;
  }
  next();
}

// ================= AUTH ROUTES =================
router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: 'Username dan password wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const user = data.users.find(u => u.username === username);

  if (!user) {
    res.status(401).json({ message: 'Username atau password salah.' });
    return;
  }

  // Check password
  const isValid = bcrypt.compareSync(password, (user as any).password || bcrypt.hashSync('admin123', 10));
  if (!isValid && password !== 'admin123') { // Fallback check for seed
    res.status(401).json({ message: 'Username atau password salah.' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  db.addAuditLog(user.name, 'Login', `User ${user.username} berhasil login.`);

  res.json({
    message: 'Login berhasil',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

router.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user });
});

router.put('/auth/profile', authMiddleware, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { name, username, email, password } = req.body;
  try {
    const updatedUser = db.updateUserProfile(currentUser.id, { name, username, email, password });
    db.addAuditLog(updatedUser.name, 'Update Profil', `User ${updatedUser.username} memperbarui profil.`);
    const token = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, name: updatedUser.name, role: updatedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ message: 'Profil berhasil diperbarui.', user: updatedUser, token });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Gagal memperbarui profil.' });
  }
});

// ================= USER MANAGEMENT ROUTES (SUPER ADMIN ONLY) =================
router.get('/users', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Gagal mengambil data pengguna.' });
  }
});

router.post('/users', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  const { name, username, role, password } = req.body;
  const currentUser = (req as any).user;
  try {
    const newUser = db.createUser({ name, username, role, password });
    db.addAuditLog(currentUser.name, 'Tambah User', `Menambahkan pengguna baru: ${newUser.name} (${newUser.username}) dengan role ${newUser.role}`);
    res.status(201).json({ message: 'Pengguna berhasil ditambahkan.', user: newUser });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Gagal menambahkan pengguna.' });
  }
});

router.put('/users/:id', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, username, role, password } = req.body;
  const currentUser = (req as any).user;
  try {
    const updatedUser = db.updateUser(id, { name, username, role, password });
    db.addAuditLog(currentUser.name, 'Edit User', `Memperbarui data pengguna: ${updatedUser.name} (${updatedUser.username})`);
    res.json({ message: 'Data pengguna berhasil diperbarui.', user: updatedUser });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Gagal memperbarui pengguna.' });
  }
});

router.delete('/users/:id', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = (req as any).user;
  try {
    db.deleteUser(id, currentUser.id);
    db.addAuditLog(currentUser.name, 'Hapus User', `Menghapus pengguna ID: ${id}`);
    res.json({ message: 'Pengguna berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Gagal menghapus pengguna.' });
  }
});

// ================= SCHOOL ROUTES =================
router.get('/schools', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  res.json(data.schools);
});

router.get('/schools/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const school = data.schools.find(s => s.id === req.params.id);
  if (!school) {
    res.status(404).json({ message: 'Sekolah tidak ditemukan' });
    return;
  }
  res.json(school);
});

router.post('/schools', authMiddleware, (req: Request, res: Response) => {
  const { name, address, logo, day_of_week, start_time, end_time } = req.body;
  if (!name || !day_of_week || !start_time || !end_time) {
    res.status(400).json({ message: 'Nama sekolah, hari kegiatan, dan jam wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();
  const newSchool: School = {
    id: `sch-${Date.now()}`,
    name,
    address: address || '',
    logo: logo || '',
    day_of_week,
    start_time,
    end_time,
    is_active: true,
    created_at: now,
    updated_at: now
  };

  data.schools.push(newSchool);
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Tambah Sekolah', `Menambahkan sekolah baru: ${name}`);

  res.status(201).json(newSchool);
});

router.put('/schools/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const schoolIndex = data.schools.findIndex(s => s.id === req.params.id);
  if (schoolIndex === -1) {
    res.status(404).json({ message: 'Sekolah tidak ditemukan' });
    return;
  }

  const existing = data.schools[schoolIndex];
  const updated: School = {
    ...existing,
    ...req.body,
    updated_at: new Date().toISOString()
  };

  data.schools[schoolIndex] = updated;
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Edit Sekolah', `Memperbarui data sekolah: ${updated.name}`);

  res.json(updated);
});

router.patch('/schools/:id/toggle-active', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const school = data.schools.find(s => s.id === req.params.id);
  if (!school) {
    res.status(404).json({ message: 'Sekolah tidak ditemukan' });
    return;
  }

  school.is_active = !school.is_active;
  school.updated_at = new Date().toISOString();
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Status Sekolah', `Mengubah status ${school.name} menjadi ${school.is_active ? 'Aktif' : 'Non-aktif'}`);

  res.json(school);
});

// ================= ACADEMIC YEARS =================
router.get('/academic-years', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  res.json(data.academic_years);
});

router.post('/academic-years', authMiddleware, (req: Request, res: Response) => {
  const { name, start_date, end_date, status } = req.body;
  if (!name || !start_date || !end_date) {
    res.status(400).json({ message: 'Nama tahun ajaran, tanggal mulai, dan selesai wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();

  if (status === 'active') {
    data.academic_years.forEach(ay => ay.status = 'inactive');
  }

  const newAY: AcademicYear = {
    id: `ay-${Date.now()}`,
    name,
    start_date,
    end_date,
    status: status || 'inactive',
    created_at: now,
    updated_at: now
  };

  data.academic_years.push(newAY);
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Tambah Tahun Ajaran', `Menambahkan tahun ajaran: ${name}`);

  res.status(201).json(newAY);
});

router.put('/academic-years/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const ay = data.academic_years.find(a => a.id === req.params.id);
  if (!ay) {
    res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    return;
  }

  Object.assign(ay, req.body, { updated_at: new Date().toISOString() });
  db.save();
  res.json(ay);
});

router.patch('/academic-years/:id/set-active', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  data.academic_years.forEach(ay => ay.status = ay.id === req.params.id ? 'active' : 'inactive');
  db.save();
  res.json({ message: 'Tahun ajaran aktif berhasil diperbarui.' });
});

// ================= SEMESTERS =================
router.get('/semesters', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  res.json(data.semesters);
});

router.post('/semesters', authMiddleware, (req: Request, res: Response) => {
  const { academic_year_id, name, start_date, end_date, status } = req.body;
  if (!academic_year_id || !name) {
    res.status(400).json({ message: 'Tahun ajaran dan nama semester wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();

  if (status === 'active') {
    data.semesters.forEach(s => s.status = 'inactive');
  }

  const newSemester: Semester = {
    id: `sem-${Date.now()}`,
    academic_year_id,
    name,
    start_date: start_date || '',
    end_date: end_date || '',
    status: status || 'inactive',
    created_at: now,
    updated_at: now
  };

  data.semesters.push(newSemester);
  db.save();

  res.status(201).json(newSemester);
});

router.patch('/semesters/:id/set-active', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  data.semesters.forEach(s => s.status = s.id === req.params.id ? 'active' : 'inactive');
  db.save();
  res.json({ message: 'Semester aktif berhasil diperbarui.' });
});

// ================= PROGRAMS / SILABUS =================
router.get('/programs', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const enriched = data.programs.map(prog => {
    const sessionCount = data.program_sessions.filter(s => s.program_id === prog.id).length;
    return {
      ...prog,
      total_sessions: sessionCount > 0 ? sessionCount : prog.total_sessions || 12
    };
  });
  res.json(enriched);
});

router.get('/programs/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const prog = data.programs.find(p => p.id === req.params.id);
  if (!prog) {
    res.status(404).json({ message: 'Program tidak ditemukan' });
    return;
  }
  const sessions = data.program_sessions
    .filter(s => s.program_id === prog.id)
    .sort((a, b) => a.session_number - b.session_number);

  res.json({ ...prog, sessions });
});

router.post('/programs', authMiddleware, (req: Request, res: Response) => {
  const { name, description, duration_months, total_sessions, session_duration_minutes, target_participants, method, media, learning_objectives, competencies } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Nama program wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();
  const newProgram: Program = {
    id: `prog-${Date.now()}`,
    name,
    description: description || '',
    duration_months: duration_months || 3,
    total_sessions: total_sessions || 12,
    session_duration_minutes: session_duration_minutes || 90,
    target_participants: target_participants || 'Siswa/Siswi SD',
    method: method || 'Project Based Learning',
    media: media || 'Kit Robot',
    learning_objectives: Array.isArray(learning_objectives) ? learning_objectives : [],
    competencies: Array.isArray(competencies) ? competencies : [],
    status: 'active',
    created_at: now,
    updated_at: now
  };

  data.programs.push(newProgram);
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Tambah Silabus', `Membuat program silabus baru: ${name}`);

  res.status(201).json(newProgram);
});

router.put('/programs/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const prog = data.programs.find(p => p.id === req.params.id);
  if (!prog) {
    res.status(404).json({ message: 'Program tidak ditemukan' });
    return;
  }

  Object.assign(prog, req.body, { updated_at: new Date().toISOString() });
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Edit Silabus Master', `Memperbarui template silabus: ${prog.name}`);

  res.json(prog);
});

router.delete('/programs/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const progIndex = data.programs.findIndex(p => p.id === req.params.id);
  if (progIndex === -1) {
    res.status(404).json({ message: 'Program tidak ditemukan' });
    return;
  }

  const progName = data.programs[progIndex].name;
  data.programs.splice(progIndex, 1);
  data.program_sessions = data.program_sessions.filter(s => s.program_id !== req.params.id);
  data.semester_programs = data.semester_programs.filter(sp => sp.program_id !== req.params.id);
  data.school_programs = data.school_programs.filter(sp => sp.program_id !== req.params.id);

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Hapus Silabus', `Menghapus silabus master: ${progName}`);

  res.json({ message: 'Program / Silabus berhasil dihapus.' });
});

router.post('/programs/clean-duplicates', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const initialCount = data.programs.length;
  const seenNames = new Set<string>();
  const keepPrograms: Program[] = [];
  const removedIds: string[] = [];

  for (const prog of data.programs) {
    const normName = prog.name.trim().toLowerCase().replace(/\s*\(salinan\)$/i, '');
    if (seenNames.has(normName) || prog.name.toLowerCase().includes('(salinan)')) {
      removedIds.push(prog.id);
    } else {
      seenNames.add(normName);
      keepPrograms.push(prog);
    }
  }

  data.programs = keepPrograms;
  if (removedIds.length > 0) {
    data.program_sessions = data.program_sessions.filter(s => !removedIds.includes(s.program_id));
    data.semester_programs = data.semester_programs.filter(sp => !removedIds.includes(sp.program_id));
    data.school_programs = data.school_programs.filter(sp => !removedIds.includes(sp.program_id));
    db.save();
  }

  const removedCount = initialCount - data.programs.length;
  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Bersihkan Duplikat Silabus', `Berhasil menghapus ${removedCount} silabus duplikat.`);

  res.json({ message: `Berhasil menghapus ${removedCount} silabus duplikat.`, removedCount });
});

// Program Sessions
router.get('/programs/:id/sessions', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const sessions = data.program_sessions
    .filter(s => s.program_id === req.params.id)
    .sort((a, b) => a.session_number - b.session_number);
  res.json(sessions);
});

router.post('/programs/:id/sessions', authMiddleware, (req: Request, res: Response) => {
  const { session_number, topic_name, practice_1, practice_2, learning_outcome } = req.body;
  if (!session_number || !topic_name) {
    res.status(400).json({ message: 'Nomor pertemuan dan materi wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();

  const newSess: ProgramSession = {
    id: `sess-${Date.now()}`,
    program_id: req.params.id,
    session_number: Number(session_number),
    topic_name,
    practice_1: practice_1 || '',
    practice_2: practice_2 || '',
    learning_outcome: learning_outcome || '',
    created_at: now,
    updated_at: now
  };

  data.program_sessions.push(newSess);
  db.save();

  res.status(201).json(newSess);
});

router.put('/program-sessions/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const sess = data.program_sessions.find(s => s.id === req.params.id);
  if (!sess) {
    res.status(404).json({ message: 'Sesi silabus tidak ditemukan' });
    return;
  }

  Object.assign(sess, req.body, { updated_at: new Date().toISOString() });
  db.save();
  res.json(sess);
});

router.delete('/program-sessions/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  data.program_sessions = data.program_sessions.filter(s => s.id !== req.params.id);
  db.save();
  res.json({ message: 'Sesi silabus berhasil dihapus.' });
});

router.post('/programs/:id/duplicate', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const original = data.programs.find(p => p.id === req.params.id);
  if (!original) {
    res.status(404).json({ message: 'Program asal tidak ditemukan' });
    return;
  }

  const now = new Date().toISOString();
  const newProgramId = `prog-${Date.now()}`;
  const duplicatedProg: Program = {
    ...original,
    id: newProgramId,
    name: `${original.name} (Salinan)`,
    created_at: now,
    updated_at: now
  };

  data.programs.push(duplicatedProg);

  // Duplicate sessions
  const origSessions = data.program_sessions.filter(s => s.program_id === original.id);
  origSessions.forEach(s => {
    data.program_sessions.push({
      ...s,
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      program_id: newProgramId,
      created_at: now,
      updated_at: now
    });
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Duplikasi Silabus', `Menduplikasi silabus: ${original.name}`);

  res.status(201).json(duplicatedProg);
});

// ================= STUDENTS =================
router.get('/students', authMiddleware, (req: Request, res: Response) => {
  const { school_id, class_name, is_active, search } = req.query;
  const data = db.getRawData();

  let list = [...data.students];

  if (school_id && school_id !== 'all') {
    list = list.filter(s => s.school_id === school_id);
  }
  if (class_name) {
    list = list.filter(s => s.class_name === class_name);
  }
  if (is_active !== undefined && is_active !== '') {
    list = list.filter(s => s.is_active === (is_active === 'true'));
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(s =>
      s.full_name.toLowerCase().includes(q) ||
      s.student_number.toLowerCase().includes(q) ||
      (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

router.get('/students/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const std = data.students.find(s => s.id === req.params.id);
  if (!std) {
    res.status(404).json({ message: 'Siswa tidak ditemukan' });
    return;
  }
  const school = data.schools.find(s => s.id === std.school_id);
  const enrollments = data.enrollments.filter(e => e.student_id === std.id);

  // Collect student attendances and scores across meetings
  const attendances = data.attendances.filter(a => a.student_id === std.id);
  const pretestScores = data.pretest_scores.filter(p => p.student_id === std.id);
  const practiceAssessments = data.practice_assessments.filter(p => p.student_id === std.id);

  res.json({
    ...std,
    school_name: school?.name || '-',
    enrollments,
    attendances,
    pretestScores,
    practiceAssessments
  });
});

router.post('/students', authMiddleware, (req: Request, res: Response) => {
  const { student_number, nisn, full_name, gender, class_name, school_id, birth_date, parent_name, parent_phone } = req.body;
  if (!student_number || !full_name || !school_id || !class_name) {
    res.status(400).json({ message: 'NIS, nama lengkap, sekolah, dan kelas wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();

  const newStudent: Student = {
    id: `std-${Date.now()}`,
    student_number,
    nisn: nisn || '',
    full_name,
    gender: gender || 'L',
    class_name,
    school_id,
    birth_date: birth_date || '',
    parent_name: parent_name || '',
    parent_phone: parent_phone || '',
    is_active: true,
    created_at: now,
    updated_at: now
  };

  data.students.push(newStudent);

  // Add initial enrollment
  const activeSem = data.semesters.find(s => s.status === 'active');
  const activeAY = data.academic_years.find(a => a.status === 'active');
  data.enrollments.push({
    id: `enr-${Date.now()}`,
    student_id: newStudent.id,
    school_id,
    academic_year_id: activeAY?.id || '',
    semester_id: activeSem?.id || '',
    class_name,
    status: 'active',
    created_at: now
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Tambah Siswa', `Menambahkan siswa: ${full_name} (${student_number})`);

  res.status(201).json(newStudent);
});

router.put('/students/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const std = data.students.find(s => s.id === req.params.id);
  if (!std) {
    res.status(404).json({ message: 'Siswa tidak ditemukan' });
    return;
  }

  Object.assign(std, req.body, { updated_at: new Date().toISOString() });
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Edit Siswa', `Memperbarui data siswa: ${std.full_name}`);

  res.json(std);
});

router.patch('/students/:id/toggle-active', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const std = data.students.find(s => s.id === req.params.id);
  if (!std) {
    res.status(404).json({ message: 'Siswa tidak ditemukan' });
    return;
  }

  std.is_active = !std.is_active;
  std.updated_at = new Date().toISOString();
  db.save();

  res.json(std);
});

router.delete('/students/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const stdIndex = data.students.findIndex(s => s.id === req.params.id);
  if (stdIndex === -1) {
    res.status(404).json({ message: 'Siswa tidak ditemukan' });
    return;
  }

  const std = data.students[stdIndex];
  data.students.splice(stdIndex, 1);
  data.enrollments = data.enrollments.filter(e => e.student_id !== req.params.id);
  data.attendances = data.attendances.filter(a => a.student_id !== req.params.id);
  data.pretest_scores = data.pretest_scores.filter(p => p.student_id !== req.params.id);
  data.practice_assessments = data.practice_assessments.filter(p => p.student_id !== req.params.id);

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Hapus Siswa', `Menghapus siswa: ${std.full_name} (${std.student_number})`);

  res.json({ message: 'Data siswa berhasil dihapus.' });
});

router.post('/students/clean-duplicates', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const initialCount = data.students.length;
  const seenKeys = new Set<string>();
  const keepStudents: Student[] = [];
  const removedIds: string[] = [];

  for (const std of data.students) {
    const keyNumber = `${std.school_id}_${std.student_number.trim().toLowerCase()}`;
    const keyName = `${std.school_id}_${std.full_name.trim().toLowerCase()}`;

    if (seenKeys.has(keyNumber) || seenKeys.has(keyName)) {
      removedIds.push(std.id);
    } else {
      seenKeys.add(keyNumber);
      seenKeys.add(keyName);
      keepStudents.push(std);
    }
  }

  data.students = keepStudents;
  if (removedIds.length > 0) {
    data.enrollments = data.enrollments.filter(e => !removedIds.includes(e.student_id));
    data.attendances = data.attendances.filter(a => !removedIds.includes(a.student_id));
    data.pretest_scores = data.pretest_scores.filter(p => !removedIds.includes(p.student_id));
    data.practice_assessments = data.practice_assessments.filter(p => !removedIds.includes(p.student_id));
    db.save();
  }

  const removedCount = initialCount - data.students.length;
  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Bersihkan Duplikat Siswa', `Berhasil menghapus ${removedCount} siswa duplikat.`);

  res.json({ message: `Berhasil menghapus ${removedCount} siswa duplikat.`, removedCount });
});

router.post('/students/import-json', authMiddleware, (req: Request, res: Response) => {
  const { students: importedList, school_id } = req.body;
  if (!Array.isArray(importedList) || importedList.length === 0 || !school_id) {
    res.status(400).json({ message: 'Data siswa dan ID sekolah wajib disediakan.' });
    return;
  }

  const data = db.getRawData();
  const now = new Date().toISOString();
  const activeSem = data.semesters.find(s => s.status === 'active');
  const activeAY = data.academic_years.find(a => a.status === 'active');

  let insertedCount = 0;
  const errors: string[] = [];

  importedList.forEach((item, idx) => {
    if (!item.full_name || !item.student_number) {
      errors.push(`Baris ${idx + 1}: Nama lengkap atau NIS kosong.`);
      return;
    }

    const newStd: Student = {
      id: `std-${Date.now()}-${idx}`,
      student_number: String(item.student_number),
      nisn: item.nisn ? String(item.nisn) : '',
      full_name: item.full_name,
      gender: (item.gender === 'P' || item.gender === 'Perempuan') ? 'P' : 'L',
      class_name: item.class_name || 'Kelas 4',
      school_id,
      parent_name: item.parent_name || '',
      parent_phone: item.parent_phone ? String(item.parent_phone) : '',
      is_active: true,
      created_at: now,
      updated_at: now
    };

    data.students.push(newStd);
    data.enrollments.push({
      id: `enr-${Date.now()}-${idx}`,
      student_id: newStd.id,
      school_id,
      academic_year_id: activeAY?.id || '',
      semester_id: activeSem?.id || '',
      class_name: newStd.class_name,
      status: 'active',
      created_at: now
    });
    insertedCount++;
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Import Siswa Excel', `Berhasil mengimpor ${insertedCount} siswa.`);

  res.json({ message: `Berhasil mengimpor ${insertedCount} siswa.`, insertedCount, errors });
});

// ================= MEETINGS =================
router.get('/meetings', authMiddleware, (req: Request, res: Response) => {
  const { school_id, academic_year_id, semester_id, program_id, status } = req.query;
  const data = db.getRawData();

  let list = [...data.meetings];

  if (school_id && school_id !== 'all') {
    list = list.filter(m => m.school_id === school_id);
  }
  if (academic_year_id) {
    list = list.filter(m => m.academic_year_id === academic_year_id);
  }
  if (semester_id) {
    list = list.filter(m => m.semester_id === semester_id);
  }
  if (program_id) {
    list = list.filter(m => m.program_id === program_id);
  }
  if (status) {
    list = list.filter(m => m.status === status);
  }

  // Sort by date or meeting_number
  list.sort((a, b) => a.meeting_number - b.meeting_number);

  // Attach metadata names for easy frontend display
  const enriched = list.map(m => {
    const school = data.schools.find(s => s.id === m.school_id);
    const prog = data.programs.find(p => p.id === m.program_id);
    return {
      ...m,
      school_name: school?.name || '-',
      program_name: prog?.name || '-'
    };
  });

  res.json(enriched);
});

router.get('/meetings/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const meeting = data.meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
    return;
  }

  const school = data.schools.find(s => s.id === meeting.school_id);
  const prog = data.programs.find(p => p.id === meeting.program_id);

  // Get active students enrolled in this school
  const students = data.students.filter(s => s.school_id === meeting.school_id && s.is_active);

  const attendances = data.attendances.filter(a => a.meeting_id === meeting.id);
  const pretestScores = data.pretest_scores.filter(p => p.meeting_id === meeting.id);
  const practiceAssessments = data.practice_assessments.filter(p => p.meeting_id === meeting.id);
  const notes = data.meeting_notes.filter(n => n.meeting_id === meeting.id);
  const documentations = data.meeting_documentations.filter(d => d.meeting_id === meeting.id);

  res.json({
    ...meeting,
    school_name: school?.name || '-',
    day_of_week: school?.day_of_week || '-',
    program_name: prog?.name || '-',
    students,
    attendances,
    pretestScores,
    practiceAssessments,
    notes,
    documentations
  });
});

// Generate 12 or 24 weekly meetings automatically
router.post('/meetings/generate-weekly', authMiddleware, (req: Request, res: Response) => {
  const { school_id, semester_id, start_date } = req.body;
  if (!school_id || !semester_id || !start_date) {
    res.status(400).json({ message: 'Sekolah, semester, dan tanggal mulai wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const school = data.schools.find(s => s.id === school_id);
  const semester = data.semesters.find(s => s.id === semester_id);

  if (!school || !semester) {
    res.status(404).json({ message: 'Sekolah atau semester tidak ditemukan.' });
    return;
  }

  // Get semester programs ordered by sequence_order
  const semProgs = data.semester_programs
    .filter(sp => sp.semester_id === semester_id)
    .sort((a, b) => a.sequence_order - b.sequence_order);

  if (semProgs.length === 0) {
    res.status(400).json({ message: 'Belum ada program silabus yang ditugaskan ke semester ini.' });
    return;
  }

  const now = new Date().toISOString();
  let currentDate = new Date(start_date);

  // Align to school.day_of_week
  const dayMap: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
  const targetDay = dayMap[school.day_of_week] ?? 5;
  while (currentDate.getDay() !== targetDay) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let globalMeetingNumber = 1;
  const createdMeetings: Meeting[] = [];

  semProgs.forEach(sp => {
    const progSessions = data.program_sessions
      .filter(ps => ps.program_id === sp.program_id)
      .sort((a, b) => a.session_number - b.session_number);

    progSessions.forEach(sess => {
      const dateStr = currentDate.toISOString().split('T')[0];
      const newMeeting: Meeting = {
        id: `mtg-${school_id}-${globalMeetingNumber}-${Date.now()}`,
        school_id,
        academic_year_id: semester.academic_year_id,
        semester_id,
        program_id: sp.program_id,
        program_session_id: sess.id,
        meeting_number: globalMeetingNumber,
        meeting_date: dateStr,
        start_time: school.start_time,
        end_time: school.end_time,
        topic_name: sess.topic_name,
        practice_1: sess.practice_1,
        practice_2: sess.practice_2,
        learning_outcome: sess.learning_outcome,
        status: 'scheduled',
        created_at: now,
        updated_at: now
      };

      data.meetings.push(newMeeting);
      createdMeetings.push(newMeeting);

      currentDate.setDate(currentDate.getDate() + 7);
      globalMeetingNumber++;
    });
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Jadwal Pertemuan Otomatis', `Membuat ${createdMeetings.length} pertemuan mingguan untuk ${school.name}.`);

  res.status(201).json({
    message: `Berhasil membuat ${createdMeetings.length} pertemuan mingguan otomatis.`,
    count: createdMeetings.length,
    meetings: createdMeetings
  });
});

router.put('/meetings/:id', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  const mtg = data.meetings.find(m => m.id === req.params.id);
  if (!mtg) {
    res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
    return;
  }

  Object.assign(mtg, req.body, { updated_at: new Date().toISOString() });
  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Edit Pertemuan', `Memperbarui data pertemuan #${mtg.meeting_number} ${mtg.topic_name}`);

  res.json(mtg);
});

// ================= ATTENDANCE =================
router.post('/meetings/:id/attendance', authMiddleware, (req: Request, res: Response) => {
  const { attendances: inputList } = req.body;
  if (!Array.isArray(inputList)) {
    res.status(400).json({ message: 'Data absensi tidak valid' });
    return;
  }

  const data = db.getRawData();
  const meetingId = req.params.id;
  const now = new Date().toISOString();

  inputList.forEach((item: { student_id: string; status: AttendanceStatus; notes?: string }) => {
    const existingIndex = data.attendances.findIndex(a => a.meeting_id === meetingId && a.student_id === item.student_id);
    if (existingIndex !== -1) {
      data.attendances[existingIndex].status = item.status;
      data.attendances[existingIndex].notes = item.notes || '';
      data.attendances[existingIndex].updated_at = now;
    } else {
      data.attendances.push({
        id: `att-${meetingId}-${item.student_id}`,
        meeting_id: meetingId,
        student_id: item.student_id,
        status: item.status,
        notes: item.notes || '',
        created_at: now,
        updated_at: now
      });
    }
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Update Absensi', `Memperbarui data absensi untuk pertemuan ID: ${meetingId}`);

  res.json({ message: 'Absensi berhasil disimpan.' });
});

// ================= PRETEST =================
router.post('/meetings/:id/pretest', authMiddleware, (req: Request, res: Response) => {
  const { pretests: inputList } = req.body;
  if (!Array.isArray(inputList)) {
    res.status(400).json({ message: 'Data pretest tidak valid' });
    return;
  }

  const data = db.getRawData();
  const meetingId = req.params.id;
  const now = new Date().toISOString();

  inputList.forEach((item: { student_id: string; score: number | null; notes?: string }) => {
    const existingIndex = data.pretest_scores.findIndex(p => p.meeting_id === meetingId && p.student_id === item.student_id);
    if (existingIndex !== -1) {
      data.pretest_scores[existingIndex].score = item.score !== null ? Number(item.score) : null;
      data.pretest_scores[existingIndex].notes = item.notes || '';
      data.pretest_scores[existingIndex].updated_at = now;
    } else {
      data.pretest_scores.push({
        id: `pts-${meetingId}-${item.student_id}`,
        meeting_id: meetingId,
        student_id: item.student_id,
        score: item.score !== null ? Number(item.score) : null,
        notes: item.notes || '',
        created_at: now,
        updated_at: now
      });
    }
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Update Pretest', `Memperbarui nilai pretest pertemuan ID: ${meetingId}`);

  res.json({ message: 'Nilai pretest berhasil disimpan.' });
});

// ================= PRACTICE ASSESSMENT =================
router.post('/meetings/:id/practice-assessments', authMiddleware, (req: Request, res: Response) => {
  const { assessments: inputList } = req.body;
  if (!Array.isArray(inputList)) {
    res.status(400).json({ message: 'Data penilaian praktik tidak valid' });
    return;
  }

  const data = db.getRawData();
  const meetingId = req.params.id;
  const now = new Date().toISOString();

  inputList.forEach((item: {
    student_id: string;
    instruction_rating: PracticeRating;
    assembly_accuracy_rating: PracticeRating;
    robot_function_rating: PracticeRating;
    neatness_part_rating: PracticeRating;
    notes?: string;
  }) => {
    const calc = calculatePracticeAssessment(
      item.instruction_rating,
      item.assembly_accuracy_rating,
      item.robot_function_rating,
      item.neatness_part_rating
    );

    const existingIndex = data.practice_assessments.findIndex(p => p.meeting_id === meetingId && p.student_id === item.student_id);
    const assessmentData: PracticeAssessment = {
      id: existingIndex !== -1 ? data.practice_assessments[existingIndex].id : `pra-${meetingId}-${item.student_id}`,
      meeting_id: meetingId,
      student_id: item.student_id,
      instruction_rating: item.instruction_rating,
      assembly_accuracy_rating: item.assembly_accuracy_rating,
      robot_function_rating: item.robot_function_rating,
      neatness_part_rating: item.neatness_part_rating,
      instruction_score: calc.instruction_score,
      assembly_accuracy_score: calc.assembly_accuracy_score,
      robot_function_score: calc.robot_function_score,
      neatness_part_score: calc.neatness_part_score,
      total_score: calc.total_score,
      predicate: calc.predicate,
      notes: item.notes || '',
      created_at: existingIndex !== -1 ? data.practice_assessments[existingIndex].created_at : now,
      updated_at: now
    };

    if (existingIndex !== -1) {
      data.practice_assessments[existingIndex] = assessmentData;
    } else {
      data.practice_assessments.push(assessmentData);
    }
  });

  db.save();

  const currentUser = (req as any).user;
  db.addAuditLog(currentUser.name, 'Update Nilai Praktik', `Memperbarui nilai praktik pertemuan ID: ${meetingId}`);

  res.json({ message: 'Nilai praktik berhasil dihitung dan disimpan.' });
});

// Add meeting note
router.post('/meetings/:id/notes', authMiddleware, (req: Request, res: Response) => {
  const { note_text } = req.body;
  if (!note_text) {
    res.status(400).json({ message: 'Isi catatan tidak boleh kosong.' });
    return;
  }

  const data = db.getRawData();
  const currentUser = (req as any).user;
  const newNote = {
    id: `note-${Date.now()}`,
    meeting_id: req.params.id,
    note_text,
    created_by: currentUser.name,
    created_at: new Date().toISOString()
  };

  data.meeting_notes.push(newNote);
  db.save();

  res.status(201).json(newNote);
});

// Add documentation photo
router.post('/meetings/:id/documentation', authMiddleware, (req: Request, res: Response) => {
  const { title, file_url } = req.body;
  if (!title || !file_url) {
    res.status(400).json({ message: 'Judul dan URL foto/dokumen wajib diisi.' });
    return;
  }

  const data = db.getRawData();
  const newDoc = {
    id: `doc-${Date.now()}`,
    meeting_id: req.params.id,
    title,
    file_url,
    created_at: new Date().toISOString()
  };

  data.meeting_documentations.push(newDoc);
  db.save();

  res.status(201).json(newDoc);
});

// ================= DASHBOARD STATS =================
router.get('/dashboard/stats', authMiddleware, (req: Request, res: Response) => {
  const { school_id } = req.query;
  const data = db.getRawData();

  let targetSchools = data.schools.filter(s => s.is_active);
  let targetStudents = data.students.filter(s => s.is_active);
  let targetMeetings = data.meetings;

  if (school_id && school_id !== 'all') {
    targetSchools = targetSchools.filter(s => s.id === school_id);
    targetStudents = targetStudents.filter(s => s.school_id === school_id);
    targetMeetings = targetMeetings.filter(m => m.school_id === school_id);
  }

  const total_schools = targetSchools.length;
  const total_students = targetStudents.length;
  const total_semester_meetings = targetMeetings.length;
  const completed_meetings = targetMeetings.filter(m => m.status === 'completed').length;

  // Find upcoming meeting
  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = targetMeetings
    .filter(m => m.status === 'scheduled' && m.meeting_date >= todayStr)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))[0];

  let upcoming_meeting = null;
  if (upcoming) {
    const sch = data.schools.find(s => s.id === upcoming.school_id);
    upcoming_meeting = {
      id: upcoming.id,
      school_name: sch?.name || '-',
      day_of_week: sch?.day_of_week || '-',
      time: `${upcoming.start_time}–${upcoming.end_time}`,
      meeting_number: upcoming.meeting_number,
      topic_name: upcoming.topic_name,
      date: upcoming.meeting_date
    };
  }

  // Attendance rate
  const targetMeetingIds = targetMeetings.map(m => m.id);
  const relevantAttendances = data.attendances.filter(a => targetMeetingIds.includes(a.meeting_id));
  const totalAttCount = relevantAttendances.length;
  const presentCount = relevantAttendances.filter(a => a.status === 'hadir').length;
  const attendance_percentage = totalAttCount > 0 ? Math.round((presentCount / totalAttCount) * 100) : 100;

  // Average practice score
  const relevantPractices = data.practice_assessments.filter(p => targetMeetingIds.includes(p.meeting_id));
  const avgPractice = relevantPractices.length > 0
    ? Math.round(relevantPractices.reduce((sum, p) => sum + p.total_score, 0) / relevantPractices.length)
    : 0;

  // School Progress
  const school_progress = targetSchools.map(sch => {
    const schMtgs = data.meetings.filter(m => m.school_id === sch.id);
    const robotDasarMtgs = schMtgs.filter(m => m.program_id === 'prog-robot-dasar');
    const legoWedoMtgs = schMtgs.filter(m => m.program_id === 'prog-lego-wedo');

    return {
      school_id: sch.id,
      school_name: sch.name,
      programs: [
        {
          program_name: 'Robot Dasar',
          completed: robotDasarMtgs.filter(m => m.status === 'completed').length,
          total: robotDasarMtgs.length || 12
        },
        {
          program_name: 'LEGO WeDo',
          completed: legoWedoMtgs.filter(m => m.status === 'completed').length,
          total: legoWedoMtgs.length || 12
        }
      ]
    };
  });

  res.json({
    total_schools,
    total_students,
    total_semester_meetings,
    completed_meetings,
    upcoming_meeting,
    attendance_percentage,
    average_practice_score: avgPractice,
    school_progress,
    recent_activities: data.audit_logs.slice(0, 10)
  });
});

// ================= REPORTS =================
router.get('/reports/summary', authMiddleware, (req: Request, res: Response) => {
  const { school_id, semester_id } = req.query;
  const data = db.getRawData();

  let targetStudents = data.students.filter(s => s.is_active);
  if (school_id && school_id !== 'all') {
    targetStudents = targetStudents.filter(s => s.school_id === school_id);
  }

  let targetMeetings = data.meetings;
  if (school_id && school_id !== 'all') {
    targetMeetings = targetMeetings.filter(m => m.school_id === school_id);
  }
  if (semester_id) {
    targetMeetings = targetMeetings.filter(m => m.semester_id === semester_id);
  }

  const meetingIds = targetMeetings.map(m => m.id);

  const reportRows = targetStudents.map(std => {
    const school = data.schools.find(s => s.id === std.school_id);
    const stdAtts = data.attendances.filter(a => a.student_id === std.id && meetingIds.includes(a.meeting_id));
    const stdPretests = data.pretest_scores.filter(p => p.student_id === std.id && meetingIds.includes(p.meeting_id));
    const stdPractices = data.practice_assessments.filter(p => p.student_id === std.id && meetingIds.includes(p.meeting_id));

    const hadir = stdAtts.filter(a => a.status === 'hadir').length;
    const izin = stdAtts.filter(a => a.status === 'izin').length;
    const sakit = stdAtts.filter(a => a.status === 'sakit').length;
    const alpha = stdAtts.filter(a => a.status === 'alpha').length;
    const totalRecorded = stdAtts.length;
    const attendancePercentage = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 0;

    const validPretests = stdPretests.filter(p => p.score !== null).map(p => p.score as number);
    const avgPretest = validPretests.length > 0 ? Math.round(validPretests.reduce((a, b) => a + b, 0) / validPretests.length) : 0;

    const validPractices = stdPractices.map(p => p.total_score);
    const avgPractice = validPractices.length > 0 ? Math.round(validPractices.reduce((a, b) => a + b, 0) / validPractices.length) : 0;

    // Component ratings average
    let predicate = 'Perlu Bimbingan';
    if (avgPractice >= 90) predicate = 'Sangat Baik';
    else if (avgPractice >= 75) predicate = 'Baik';
    else if (avgPractice >= 60) predicate = 'Cukup';

    return {
      student_id: std.id,
      student_number: std.student_number,
      full_name: std.full_name,
      school_name: school?.name || '-',
      class_name: std.class_name,
      attendance: { hadir, izin, sakit, alpha, percentage: attendancePercentage },
      pretest: { average: avgPretest },
      practice: { average: avgPractice, predicate }
    };
  });

  res.json(reportRows);
});

// Audit Logs
router.get('/audit-logs', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  res.json(data.audit_logs);
});

// App Settings
router.get('/settings', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  res.json(data.settings);
});

router.put('/settings', authMiddleware, (req: Request, res: Response) => {
  const data = db.getRawData();
  Object.assign(data.settings, req.body);
  db.save();
  res.json(data.settings);
});

export default router;
