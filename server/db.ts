import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User, School, AcademicYear, Semester, Program, ProgramSession,
  SemesterProgram, SchoolProgram, Student, Enrollment, Meeting,
  Attendance, PracticeAssessment, PretestScore, MeetingNote,
  MeetingDocumentation, AuditLog, AppSettings, PracticeRating
} from '../src/types';
import { fetchFromFirestore, saveToFirestore, firestore } from './firebase';

const DB_FILE = path.join(process.cwd(), 'database.json');

export interface DatabaseSchema {
  users: User[];
  schools: School[];
  academic_years: AcademicYear[];
  semesters: Semester[];
  programs: Program[];
  program_sessions: ProgramSession[];
  semester_programs: SemesterProgram[];
  school_programs: SchoolProgram[];
  students: Student[];
  enrollments: Enrollment[];
  meetings: Meeting[];
  attendances: Attendance[];
  practice_assessments: PracticeAssessment[];
  pretest_scores: PretestScore[];
  meeting_notes: MeetingNote[];
  meeting_documentations: MeetingDocumentation[];
  audit_logs: AuditLog[];
  settings: AppSettings;
}

const RATING_SCORES: Record<PracticeRating, number> = {
  SB: 25,
  B: 20,
  C: 15,
  PB: 10
};

export function calculatePracticeAssessment(
  instruction: PracticeRating,
  accuracy: PracticeRating,
  robotFunction: PracticeRating,
  neatness: PracticeRating
) {
  const instruction_score = RATING_SCORES[instruction];
  const assembly_accuracy_score = RATING_SCORES[accuracy];
  const robot_function_score = RATING_SCORES[robotFunction];
  const neatness_part_score = RATING_SCORES[neatness];

  const total_score = instruction_score + assembly_accuracy_score + robot_function_score + neatness_part_score;

  let predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan' = 'Perlu Bimbingan';
  if (total_score >= 90) predicate = 'Sangat Baik';
  else if (total_score >= 75) predicate = 'Baik';
  else if (total_score >= 60) predicate = 'Cukup';

  return {
    instruction_score,
    assembly_accuracy_score,
    robot_function_score,
    neatness_part_score,
    total_score,
    predicate
  };
}

class JSONDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrCreate();
    this.cleanDuplicateMeetingsAndNormalize();
    this.initFirestoreSync();
  }

  private async initFirestoreSync() {
    if (!firestore) return;
    try {
      const cloudData = await fetchFromFirestore();
      if (cloudData && typeof cloudData === 'object' && cloudData.users) {
        console.log('✅ Synchronized dataset from Firebase Firestore!');
        this.data = cloudData as DatabaseSchema;
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } else {
        console.log('📤 Firestore empty, uploading local dataset to Firebase Firestore...');
        await saveToFirestore(this.data);
      }
    } catch (err) {
      console.error('Error during Firestore sync:', err);
    }
  }

  private cleanDuplicateMeetingsAndNormalize() {
    if (!this.data) return;

    const now = new Date().toISOString();

    // Ensure prog-scratch exists in programs
    if (!Array.isArray(this.data.programs)) this.data.programs = [];
    if (!this.data.programs.some(p => p.id === 'prog-scratch')) {
      this.data.programs.push({
        id: 'prog-scratch',
        name: 'Pembelajaran Scratch (Semester 2)',
        description: 'Program pengenalan logika pemrograman dan computational thinking melalui media visual berbasis blok Scratch. Peserta mempelajari event, loop, kondisi, variabel, hingga pembuatan game dan animasi interaktif.',
        duration_months: 4,
        total_sessions: 16,
        session_duration_minutes: 90,
        target_participants: 'Siswa/Siswi kelas 4-6',
        method: 'Praktik langsung (hands-on), proyek, diskusi',
        media: 'Komputer/Laptop, Internet, Scratch Online/Offline',
        learning_objectives: [
          'Memahami konsep dasar logika pemrograman',
          'Menggunakan Scratch untuk membuat animasi dan game sederhana',
          'Menerapkan event, kondisi, loop, dan variabel',
          'Mengembangkan kreativitas dan kemampuan problem solving',
          'Menyusun dan mempresentasikan proyek digital sederhana'
        ],
        competencies: [
          'Memahami konsep computational thinking',
          'Mampu membuat program Scratch interaktif',
          'Mampu menyusun logika program secara runtut',
          'Meningkatkan kreativitas, ketelitian, dan kemandirian'
        ],
        passing_criteria: 'Minimal kehadiran 80% dan menyelesaikan proyek final Scratch',
        output_program: 'Game/Animasi interaktif Scratch karya mandiri siswa',
        status: 'active',
        created_at: now,
        updated_at: now
      });
    }

    // Ensure scratch 16 sessions exist
    if (!Array.isArray(this.data.program_sessions)) this.data.program_sessions = [];
    const scratchSessions: ProgramSession[] = [
      { id: 'sess-sc-1', program_id: 'prog-scratch', session_number: 1, topic_name: 'Pengenalan Scratch & Computational Thinking', practice_1: 'Mengenal antarmuka Scratch & blok motion', practice_2: '-', learning_outcome: 'Membuat 1 sprite bergerak dan menampilkan teks sapaan', created_at: now, updated_at: now },
      { id: 'sess-sc-2', program_id: 'prog-scratch', session_number: 2, topic_name: 'Gerak & Koordinat (Motion)', practice_1: 'Menggerakkan sprite dengan keyboard', practice_2: '-', learning_outcome: 'Membuat sprite bergerak 4 arah dengan tombol panah', created_at: now, updated_at: now },
      { id: 'sess-sc-3', program_id: 'prog-scratch', session_number: 3, topic_name: 'Event & Interaksi', practice_1: 'Event, broadcast, receive', practice_2: '-', learning_outcome: 'Membuat 2 sprite saling berinteraksi menggunakan broadcast', created_at: now, updated_at: now },
      { id: 'sess-sc-4', program_id: 'prog-scratch', session_number: 4, topic_name: 'Control & Logika Dasar', practice_1: 'Loop dan kondisi', practice_2: '-', learning_outcome: 'Sprite bergerak terus dan berhenti saat menyentuh warna tertentu', created_at: now, updated_at: now },
      { id: 'sess-sc-5', program_id: 'prog-scratch', session_number: 5, topic_name: 'Variabel', practice_1: 'Membuat skor dan nyawa', practice_2: '-', learning_outcome: 'Game sederhana dengan skor bertambah saat menyentuh objek', created_at: now, updated_at: now },
      { id: 'sess-sc-6', program_id: 'prog-scratch', session_number: 6, topic_name: 'Operator & Random', practice_1: 'Posisi acak dan perhitungan skor', practice_2: '-', learning_outcome: 'Objek muncul di posisi acak dengan nilai skor berbeda', created_at: now, updated_at: now },
      { id: 'sess-sc-7', program_id: 'prog-scratch', session_number: 7, topic_name: 'Sensor & Tabrakan', practice_1: 'Deteksi sentuhan dan jarak', practice_2: '-', learning_outcome: 'Game sederhana menghindari musuh', created_at: now, updated_at: now },
      { id: 'sess-sc-8', program_id: 'prog-scratch', session_number: 8, topic_name: 'Costume & Animasi', practice_1: 'Animasi sprite dengan costume', practice_2: '-', learning_outcome: 'Sprite memiliki animasi minimal 3 costume', created_at: now, updated_at: now },
      { id: 'sess-sc-9', program_id: 'prog-scratch', session_number: 9, topic_name: 'Background & Scene', practice_1: 'Menu dan pergantian scene', practice_2: '-', learning_outcome: 'Menu awal dengan tombol start', created_at: now, updated_at: now },
      { id: 'sess-sc-10', program_id: 'prog-scratch', session_number: 10, topic_name: 'Sound & Efek', practice_1: 'Menambahkan sound effect', practice_2: '-', learning_outcome: 'Game memiliki minimal 3 efek suara', created_at: now, updated_at: now },
      { id: 'sess-sc-11', program_id: 'prog-scratch', session_number: 11, topic_name: 'Clone', practice_1: 'Clone musuh/objek', practice_2: '-', learning_outcome: 'Game menggunakan clone yang muncul berulang', created_at: now, updated_at: now },
      { id: 'sess-sc-12', program_id: 'prog-scratch', session_number: 12, topic_name: 'List (Array)', practice_1: 'Menyimpan data skor', practice_2: '-', learning_outcome: 'List untuk menyimpan skor atau nama pemain', created_at: now, updated_at: now },
      { id: 'sess-sc-13', program_id: 'prog-scratch', session_number: 13, topic_name: 'Desain Game & Storyboard', practice_1: 'Merancang konsep game', practice_2: '-', learning_outcome: 'Dokumen desain game (judul, aturan, tujuan)', created_at: now, updated_at: now },
      { id: 'sess-sc-14', program_id: 'prog-scratch', session_number: 14, topic_name: 'Proyek Final (1)', practice_1: 'Implementasi game', practice_2: '-', learning_outcome: 'Progres minimal 50%', created_at: now, updated_at: now },
      { id: 'sess-sc-15', program_id: 'prog-scratch', session_number: 15, topic_name: 'Proyek Final (2)', practice_1: 'Debug dan penyempurnaan', practice_2: '-', learning_outcome: 'Game siap dimainkan', created_at: now, updated_at: now },
      { id: 'sess-sc-16', program_id: 'prog-scratch', session_number: 16, topic_name: 'Presentasi & Evaluasi', practice_1: 'Presentasi proyek', practice_2: '-', learning_outcome: 'Game final & refleksi', created_at: now, updated_at: now }
    ];

    scratchSessions.forEach(sess => {
      if (!this.data.program_sessions.some(s => s.id === sess.id)) {
        this.data.program_sessions.push(sess);
      }
    });

    // Ensure semester_programs for Semester 2 has Scratch
    if (!Array.isArray(this.data.semester_programs)) this.data.semester_programs = [];
    if (!this.data.semester_programs.some(sp => sp.program_id === 'prog-scratch')) {
      this.data.semester_programs.push({
        id: 'semprog-scratch',
        semester_id: 'sem-2-2027',
        program_id: 'prog-scratch',
        sequence_order: 1,
        start_period: 'Bulan 1-4',
        end_period: 'Pertemuan 1-16'
      });
    }

    // Ensure school_programs for Semester 2 has Scratch
    if (!Array.isArray(this.data.school_programs)) this.data.school_programs = [];
    if (!this.data.school_programs.some(sp => sp.program_id === 'prog-scratch' && sp.school_id === 'sch-1')) {
      this.data.school_programs.push({
        id: 'sp-scratch-sch-1',
        school_id: 'sch-1',
        academic_year_id: 'ay-2026-2027',
        semester_id: 'sem-2-2027',
        program_id: 'prog-scratch',
        is_active: true
      });
    }

    if (!this.data.school_programs.some(sp => sp.program_id === 'prog-scratch' && sp.school_id === 'sch-2')) {
      this.data.school_programs.push({
        id: 'sp-scratch-sch-2',
        school_id: 'sch-2',
        academic_year_id: 'ay-2026-2027',
        semester_id: 'sem-2-2027',
        program_id: 'prog-scratch',
        is_active: true
      });
    }

    // Filter duplicate meetings
    if (!Array.isArray(this.data.meetings)) this.data.meetings = [];
    const seenMap = new Map<string, Meeting>();
    const cleanedMeetings: Meeting[] = [];

    for (const mtg of this.data.meetings) {
      const key = `${mtg.school_id}_${mtg.meeting_number}`;
      if (!seenMap.has(key)) {
        seenMap.set(key, mtg);
        cleanedMeetings.push(mtg);
      } else {
        const existing = seenMap.get(key)!;
        if (existing.status !== 'completed' && mtg.status === 'completed') {
          const idx = cleanedMeetings.findIndex(m => m.id === existing.id);
          if (idx !== -1) {
            cleanedMeetings[idx] = mtg;
            seenMap.set(key, mtg);
          }
        }
      }
    }

    // Set dates and statuses according to exact user dates:
    // SDIT RMK (sch-1): First meeting starts on 17 July 2026 (2026-07-17)
    // SDN 1 Darma (sch-2): Start date not decided yet (Belum Ditentukan)
    let rmkCurrentDate = new Date('2026-07-17');

    // Separate meetings by school
    const sch1Meetings = cleanedMeetings.filter(m => m.school_id === 'sch-1').sort((a, b) => a.meeting_number - b.meeting_number);
    const sch2Meetings = cleanedMeetings.filter(m => m.school_id === 'sch-2').sort((a, b) => a.meeting_number - b.meeting_number);
    const otherMeetings = cleanedMeetings.filter(m => m.school_id !== 'sch-1' && m.school_id !== 'sch-2');

    sch1Meetings.forEach((mtg, idx) => {
      const d = new Date('2026-07-17');
      d.setDate(d.getDate() + (idx * 7));
      mtg.meeting_date = d.toISOString().split('T')[0];
      if (mtg.meeting_number <= 4) {
        mtg.status = 'completed';
      } else {
        mtg.status = 'scheduled';
      }
    });

    sch2Meetings.forEach((mtg) => {
      mtg.meeting_date = 'Belum Ditentukan';
      mtg.status = 'scheduled';
    });

    this.data.meetings = [...sch1Meetings, ...sch2Meetings, ...otherMeetings];
    this.saveData();
  }

  private loadOrCreate(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading database file, re-initializing seed:', e);
      }
    }
    const seeded = this.getInitialSeed();
    this.saveData(seeded);
    return seeded;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    const target = dataToSave || this.data;
    fs.writeFileSync(DB_FILE, JSON.stringify(target, null, 2), 'utf-8');
    saveToFirestore(target).catch(err => {
      console.error('Failed to save to Firestore in background:', err);
    });
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public save() {
    this.saveData();
  }

  public getUsers(): User[] {
    return this.data.users.map(({ password, ...u }: any) => u);
  }

  public createUser(userData: { name: string; username: string; role?: 'superadmin' | 'admin'; password?: string }) {
    if (!userData.name || !userData.username) {
      throw new Error('Nama dan Username wajib diisi.');
    }
    const existing = this.data.users.find(u => u.username === userData.username);
    if (existing) {
      throw new Error('Username sudah terdaftar.');
    }
    const now = new Date().toISOString();
    const newUser: any = {
      id: 'usr-' + Date.now(),
      username: userData.username,
      name: userData.name,
      email: `${userData.username}@ekstra-robotika.sch.id`,
      role: userData.role || 'admin',
      password: bcrypt.hashSync(userData.password || 'admin123', 10),
      created_at: now,
      updated_at: now
    };
    this.data.users.push(newUser);
    this.save();
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  }

  public updateUser(id: string, updates: { name?: string; username?: string; role?: 'superadmin' | 'admin'; password?: string }) {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }
    const user: any = this.data.users[userIndex];
    if (updates.username && updates.username !== user.username) {
      const existing = this.data.users.find(u => u.username === updates.username && u.id !== id);
      if (existing) {
        throw new Error('Username sudah digunakan pengguna lain.');
      }
      user.username = updates.username;
    }
    if (updates.name) user.name = updates.name;
    if (updates.role) user.role = updates.role;
    if (updates.password && updates.password.trim() !== '') {
      user.password = bcrypt.hashSync(updates.password, 10);
    }
    user.updated_at = new Date().toISOString();
    this.save();
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  public deleteUser(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
    }
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }
    this.data.users.splice(userIndex, 1);
    this.save();
    return true;
  }

  public updateUserProfile(userId: string, updates: { name?: string; username?: string; email?: string; password?: string }) {
    const userIndex = this.data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }
    const user = this.data.users[userIndex];
    if (updates.username && updates.username !== user.username) {
      const existing = this.data.users.find(u => u.username === updates.username && u.id !== userId);
      if (existing) {
        throw new Error('Username sudah digunakan oleh pengguna lain.');
      }
      user.username = updates.username;
    }
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;
    if (updates.password && updates.password.trim() !== '') {
      (user as any).password = bcrypt.hashSync(updates.password, 10);
    }
    user.updated_at = new Date().toISOString();
    this.save();
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }

  private getInitialSeed(): DatabaseSchema {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const now = new Date().toISOString();

    const user: User = {
      id: 'usr-1',
      username: 'admin',
      name: 'DIL Admin',
      email: 'admin@ekstra-robotika.sch.id',
      role: 'superadmin',
      created_at: now,
      updated_at: now
    };

    const schools: School[] = [
      {
        id: 'sch-1',
        name: 'SDIT RMK',
        address: 'Jl. RMK No. 12, Kelapa Gading, Jakarta Utara',
        logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
        day_of_week: 'Jumat',
        start_time: '13:00',
        end_time: '14:30',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'sch-2',
        name: 'SDN 1 Darma',
        address: 'Jl. Raya Darma No. 1, Kuningan, Jawa Barat',
        logo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=80',
        day_of_week: 'Senin',
        start_time: '13:00',
        end_time: '14:30',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    const academicYears: AcademicYear[] = [
      {
        id: 'ay-2026-2027',
        name: '2026/2027',
        start_date: '2026-07-01',
        end_date: '2027-06-30',
        status: 'active',
        created_at: now,
        updated_at: now
      }
    ];

    const semesters: Semester[] = [
      {
        id: 'sem-1-2026',
        academic_year_id: 'ay-2026-2027',
        name: 'Semester 1',
        start_date: '2026-07-01',
        end_date: '2026-12-31',
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        id: 'sem-2-2027',
        academic_year_id: 'ay-2026-2027',
        name: 'Semester 2',
        start_date: '2027-01-01',
        end_date: '2027-06-30',
        status: 'inactive',
        created_at: now,
        updated_at: now
      }
    ];

    const programs: Program[] = [
      {
        id: 'prog-robot-dasar',
        name: 'Ekstrakurikuler Robot Dasar',
        description: 'Pembelajaran dasar mekanik, motor, dan keseimbangan robot mekanik untuk membangun fondasi ketelitian dan logika teknik.',
        duration_months: 3,
        total_sessions: 12,
        session_duration_minutes: 90,
        target_participants: 'Siswa/Siswi kelas 4-6',
        method: 'Fun Learning & Project Based Learning',
        media: 'Kit robot motor mekanik',
        learning_objectives: [
          'Mengenal komponen dasar robot mekanik',
          'Merakit robot sederhana berbasis motor',
          'Memahami prinsip gerak, keseimbangan, dan daya',
          'Mengoperasikan robot secara manual dengan aman',
          'Menunjukkan kreativitas dan kemandirian dalam merakit robot'
        ],
        competencies: [
          'Memahami fungsi motor dan sumber daya',
          'Mampu merakit berbagai bentuk robot mekanik',
          'Memahami hubungan struktur, roda, gear, dan gerakan',
          'Meningkatkan ketelitian, kesabaran, dan kerja sama'
        ],
        passing_criteria: 'Minimal kehadiran 80% dan nilai rata-rata praktik "Baik"',
        output_program: 'Merakit dan mempresentasikan robot mekanik mandiri',
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        id: 'prog-lego-wedo',
        name: 'Ekstrakurikuler Robotika & Coding LEGO WeDo',
        description: 'Pengenalan robotika dan logika pemrograman komputer berbasis blok (visual coding) menggunakan kit LEGO WeDo.',
        duration_months: 3,
        total_sessions: 12,
        session_duration_minutes: 90,
        target_participants: 'Siswa/Siswi kelas 4-6',
        method: 'Fun Learning & Project Based Learning',
        media: 'LEGO WeDo, Laptop / Tablet / Smartphone',
        learning_objectives: [
          'Mengenal dan menggunakan komponen LEGO WeDo',
          'Memahami konsep dasar coding seperti urutan, loop, dan kondisi',
          'Membuat dan memodifikasi robot sederhana',
          'Mengembangkan logika, kreativitas, dan kerja sama'
        ],
        competencies: [
          'Memahami motor, sensor, dan mekanik sederhana',
          'Mampu merakit model robot',
          'Menguasai dasar coding berbasis blok',
          'Mengembangkan problem solving',
          'Mampu bekerja sama dan berkomunikasi'
        ],
        passing_criteria: 'Minimal kehadiran 80% dan berhasil membuat proyek mini robot coding',
        output_program: 'Proyek robotik interaktif yang dikendalikan dengan program coding',
        status: 'active',
        created_at: now,
        updated_at: now
      }
    ];

    // Sessions for Robot Dasar (12)
    const robotDasarSessions: ProgramSession[] = [
      { id: 'sess-rd-1', program_id: 'prog-robot-dasar', session_number: 1, topic_name: 'Pengenalan Robot & Keselamatan', practice_1: 'Big Windmill', practice_2: 'Gorilla', learning_outcome: 'Mengenal komponen & aturan keselamatan', created_at: now, updated_at: now },
      { id: 'sess-rd-2', program_id: 'prog-robot-dasar', session_number: 2, topic_name: 'Sistem Roda & Motor', practice_1: 'Crane', practice_2: 'Tricycle', learning_outcome: 'Robot dapat bergerak stabil', created_at: now, updated_at: now },
      { id: 'sess-rd-3', program_id: 'prog-robot-dasar', session_number: 3, topic_name: 'Gerak Lurus & Stabilitas', practice_1: 'Locomotive', practice_2: 'Tank', learning_outcome: 'Memahami gerak lurus', created_at: now, updated_at: now },
      { id: 'sess-rd-4', program_id: 'prog-robot-dasar', session_number: 4, topic_name: 'Mekanisme Gerak Berulang', practice_1: 'Pirate Ship', practice_2: 'Mechanical Bug', learning_outcome: 'Memahami gerak mekanik', created_at: now, updated_at: now },
      { id: 'sess-rd-5', program_id: 'prog-robot-dasar', session_number: 5, topic_name: 'Mekanisme Linkage', practice_1: 'Crocodile', practice_2: '-', learning_outcome: 'Memahami mekanisme buka-tutup', created_at: now, updated_at: now },
      { id: 'sess-rd-6', program_id: 'prog-robot-dasar', session_number: 6, topic_name: 'Gerak Kaki & Keseimbangan', practice_1: 'Crab', practice_2: 'Beetle', learning_outcome: 'Menjaga keseimbangan robot', created_at: now, updated_at: now },
      { id: 'sess-rd-7', program_id: 'prog-robot-dasar', session_number: 7, topic_name: 'Daya Dorong & Angkat', practice_1: 'Tractor Truck', practice_2: 'Shovel Loader', learning_outcome: 'Motor bekerja dengan beban', created_at: now, updated_at: now },
      { id: 'sess-rd-8', program_id: 'prog-robot-dasar', session_number: 8, topic_name: 'Struktur Kompleks', practice_1: 'Excavator', practice_2: 'Mars Rover', learning_outcome: 'Struktur kuat & fungsional', created_at: now, updated_at: now },
      { id: 'sess-rd-9', program_id: 'prog-robot-dasar', session_number: 9, topic_name: 'Gerak Menyerupai Hewan', practice_1: 'Mechanical Dog', practice_2: 'Mechanical Bird', learning_outcome: 'Meniru gerak alami', created_at: now, updated_at: now },
      { id: 'sess-rd-10', program_id: 'prog-robot-dasar', session_number: 10, topic_name: 'Keseimbangan Dinamis', practice_1: 'Penguin', practice_2: 'Ostrich', learning_outcome: 'Mengatur pusat berat', created_at: now, updated_at: now },
      { id: 'sess-rd-11', program_id: 'prog-robot-dasar', session_number: 11, topic_name: 'Gerak Rotasi', practice_1: 'Helicopter', practice_2: 'Fighter Jet', learning_outcome: 'Memahami gerak rotasi', created_at: now, updated_at: now },
      { id: 'sess-rd-12', program_id: 'prog-robot-dasar', session_number: 12, topic_name: 'Evaluasi & Mini Proyek', practice_1: 'Spider', practice_2: 'Carousel', learning_outcome: 'Kemandirian & presentasi', created_at: now, updated_at: now }
    ];

    // Sessions for LEGO WeDo (12)
    const legoWedoSessions: ProgramSession[] = [
      { id: 'sess-lw-1', program_id: 'prog-lego-wedo', session_number: 1, topic_name: 'Pengenalan Robot & LEGO WeDo', practice_1: 'Football Player', practice_2: 'Swing Car', learning_outcome: 'Mengenal komponen & aturan', created_at: now, updated_at: now },
      { id: 'sess-lw-2', program_id: 'prog-lego-wedo', session_number: 2, topic_name: 'Motor & Gerak', practice_1: 'Gyro transmitter', practice_2: 'Crab', learning_outcome: 'Motor bergerak sesuai perintah', created_at: now, updated_at: now },
      { id: 'sess-lw-3', program_id: 'prog-lego-wedo', session_number: 3, topic_name: 'Coding Dasar', practice_1: 'Ship lock', practice_2: 'Oil Extraction', learning_outcome: 'Memahami urutan perintah', created_at: now, updated_at: now },
      { id: 'sess-lw-4', program_id: 'prog-lego-wedo', session_number: 4, topic_name: 'Kecepatan & Waktu', practice_1: 'Racing', practice_2: 'Obstacle avoidance', learning_outcome: 'Mengatur waktu & kecepatan', created_at: now, updated_at: now },
      { id: 'sess-lw-5', program_id: 'prog-lego-wedo', session_number: 5, topic_name: 'Sensor Jarak', practice_1: 'Ferris Wheel', practice_2: 'Dump Truck', learning_outcome: 'Robot merespon objek', created_at: now, updated_at: now },
      { id: 'sess-lw-6', program_id: 'prog-lego-wedo', session_number: 6, topic_name: 'Sensor Tilt', practice_1: 'Forklift', practice_2: 'Rotating flying chair', learning_outcome: 'Respon arah gerak', created_at: now, updated_at: now },
      { id: 'sess-lw-7', program_id: 'prog-lego-wedo', session_number: 7, topic_name: 'Percabangan', practice_1: 'Shopping cart', practice_2: 'Crocodile', learning_outcome: 'Konsep jika-maka', created_at: now, updated_at: now },
      { id: 'sess-lw-8', program_id: 'prog-lego-wedo', session_number: 8, topic_name: 'Loop / Perulangan', practice_1: 'Caterpillars', practice_2: 'Helicopter', learning_outcome: 'Program berulang', created_at: now, updated_at: now },
      { id: 'sess-lw-9', program_id: 'prog-lego-wedo', session_number: 9, topic_name: 'Perencanaan Proyek', practice_1: 'Gambar ide robot', practice_2: 'Diskusi desain', learning_outcome: 'Mampu merancang robot', created_at: now, updated_at: now },
      { id: 'sess-lw-10', program_id: 'prog-lego-wedo', session_number: 10, topic_name: 'Perakitan Proyek', practice_1: 'Merakit robot', practice_2: 'Uji coba gerak', learning_outcome: 'Robot berjalan', created_at: now, updated_at: now },
      { id: 'sess-lw-11', program_id: 'prog-lego-wedo', session_number: 11, topic_name: 'Coding Proyek', practice_1: 'Coding fungsi utama', practice_2: 'Penyempurnaan', learning_outcome: 'Robot sesuai rencana', created_at: now, updated_at: now },
      { id: 'sess-lw-12', program_id: 'prog-lego-wedo', session_number: 12, topic_name: 'Presentasi Proyek', practice_1: 'Demo robot', practice_2: 'Evaluasi & games', learning_outcome: 'Percaya diri & evaluasi', created_at: now, updated_at: now }
    ];

    const semesterPrograms: SemesterProgram[] = [
      { id: 'semprog-1', semester_id: 'sem-1-2026', program_id: 'prog-robot-dasar', sequence_order: 1, start_period: 'Bulan 1-3', end_period: 'Pertemuan 1-12' },
      { id: 'semprog-2', semester_id: 'sem-1-2026', program_id: 'prog-lego-wedo', sequence_order: 2, start_period: 'Bulan 4-6', end_period: 'Pertemuan 13-24' }
    ];

    const schoolPrograms: SchoolProgram[] = [
      { id: 'sp-1', school_id: 'sch-1', academic_year_id: 'ay-2026-2027', semester_id: 'sem-1-2026', program_id: 'prog-robot-dasar', is_active: true },
      { id: 'sp-2', school_id: 'sch-1', academic_year_id: 'ay-2026-2027', semester_id: 'sem-1-2026', program_id: 'prog-lego-wedo', is_active: true },
      { id: 'sp-3', school_id: 'sch-2', academic_year_id: 'ay-2026-2027', semester_id: 'sem-1-2026', program_id: 'prog-robot-dasar', is_active: true },
      { id: 'sp-4', school_id: 'sch-2', academic_year_id: 'ay-2026-2027', semester_id: 'sem-1-2026', program_id: 'prog-lego-wedo', is_active: true }
    ];

    const students: Student[] = [
      // SDIT RMK Students
      { id: 'std-1', student_number: '2026001', nisn: '0123456781', full_name: 'Ahmad Rizky Pratama', gender: 'L', class_name: 'Kelas 4A', school_id: 'sch-1', parent_name: 'Bapak Rizky', parent_phone: '081234567890', is_active: true, created_at: now, updated_at: now },
      { id: 'std-2', student_number: '2026002', nisn: '0123456782', full_name: 'Budi Santoso', gender: 'L', class_name: 'Kelas 5B', school_id: 'sch-1', parent_name: 'Bapak Santoso', parent_phone: '081234567891', is_active: true, created_at: now, updated_at: now },
      { id: 'std-3', student_number: '2026003', nisn: '0123456783', full_name: 'Citra Lestari', gender: 'P', class_name: 'Kelas 4A', school_id: 'sch-1', parent_name: 'Ibu Lestari', parent_phone: '081234567892', is_active: true, created_at: now, updated_at: now },
      { id: 'std-4', student_number: '2026004', nisn: '0123456784', full_name: 'Deni Kurniawan', gender: 'L', class_name: 'Kelas 6A', school_id: 'sch-1', parent_name: 'Bapak Kurniawan', parent_phone: '081234567893', is_active: true, created_at: now, updated_at: now },
      { id: 'std-5', student_number: '2026005', nisn: '0123456785', full_name: 'Eka Putri Nabila', gender: 'P', class_name: 'Kelas 5A', school_id: 'sch-1', parent_name: 'Ibu Nabila', parent_phone: '081234567894', is_active: true, created_at: now, updated_at: now },

      // SDN 1 Darma Students
      { id: 'std-6', student_number: '2026101', nisn: '0123456791', full_name: 'Fajar Nugraha', gender: 'L', class_name: 'Kelas 4', school_id: 'sch-2', parent_name: 'Bapak Fajar', parent_phone: '081398765432', is_active: true, created_at: now, updated_at: now },
      { id: 'std-7', student_number: '2026102', nisn: '0123456792', full_name: 'Gita Permata', gender: 'P', class_name: 'Kelas 5', school_id: 'sch-2', parent_name: 'Ibu Permata', parent_phone: '081398765433', is_active: true, created_at: now, updated_at: now },
      { id: 'std-8', student_number: '2026103', nisn: '0123456793', full_name: 'Hafiz Maulana', gender: 'L', class_name: 'Kelas 6', school_id: 'sch-2', parent_name: 'Bapak Maulana', parent_phone: '081398765434', is_active: true, created_at: now, updated_at: now },
      { id: 'std-9', student_number: '2026104', nisn: '0123456794', full_name: 'Indah Cahyani', gender: 'P', class_name: 'Kelas 4', school_id: 'sch-2', parent_name: 'Ibu Cahyani', parent_phone: '081398765435', is_active: true, created_at: now, updated_at: now }
    ];

    const enrollments: Enrollment[] = students.map((std, idx) => ({
      id: `enr-${idx + 1}`,
      student_id: std.id,
      school_id: std.school_id,
      academic_year_id: 'ay-2026-2027',
      semester_id: 'sem-1-2026',
      class_name: std.class_name,
      status: 'active',
      created_at: now
    }));

    // Auto generate sample actual meetings for standard display!
    const meetings: Meeting[] = [];
    const attendances: Attendance[] = [];
    const practiceAssessments: PracticeAssessment[] = [];
    const pretestScores: PretestScore[] = [];

    // Generator for SDIT RMK (Jumat) & SDN 1 Darma (Senin)
    const generateSchoolMeetings = (
      schoolId: string,
      dayOfWeek: 'Jumat' | 'Senin',
      startDateStr: string
    ) => {
      let currentDate = new Date(startDateStr);
      // Align currentDate to dayOfWeek
      const targetDay = dayOfWeek === 'Jumat' ? 5 : 1; // 0=Sun, 1=Mon... 5=Fri
      while (currentDate.getDay() !== targetDay) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let globalMeetingNum = 1;

      // 12 Sessions Robot Dasar
      robotDasarSessions.forEach((sess) => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const meetingId = `mtg-${schoolId}-${globalMeetingNum}`;
        const isPast = schoolId === 'sch-1' && globalMeetingNum <= 4; // SDIT RMK up to week 4 completed, SDN 1 Darma not started yet

        meetings.push({
          id: meetingId,
          school_id: schoolId,
          academic_year_id: 'ay-2026-2027',
          semester_id: 'sem-1-2026',
          program_id: 'prog-robot-dasar',
          program_session_id: sess.id,
          meeting_number: globalMeetingNum,
          meeting_date: dateStr,
          start_time: '13:00',
          end_time: '14:30',
          topic_name: sess.topic_name,
          practice_1: sess.practice_1,
          practice_2: sess.practice_2,
          learning_outcome: sess.learning_outcome,
          status: isPast ? 'completed' : 'scheduled',
          notes: isPast ? `Pertemuan berjalan lancar, siswa antusias merakit ${sess.practice_1}.` : undefined,
          created_at: now,
          updated_at: now
        });

        // Seed data for completed meetings
        if (isPast) {
          const schoolStudents = students.filter(s => s.school_id === schoolId);
          schoolStudents.forEach((std, sIdx) => {
            const attStatus = (sIdx === 2 && globalMeetingNum === 2) ? 'izin' : 'hadir';
            attendances.push({
              id: `att-${meetingId}-${std.id}`,
              meeting_id: meetingId,
              student_id: std.id,
              status: attStatus,
              created_at: now,
              updated_at: now
            });

            if (attStatus === 'hadir') {
              // Pretest
              const pretestScore = 75 + (sIdx * 5) % 25;
              pretestScores.push({
                id: `pts-${meetingId}-${std.id}`,
                meeting_id: meetingId,
                student_id: std.id,
                score: pretestScore,
                created_at: now,
                updated_at: now
              });

              // Practice Assessment
              const ratings: PracticeRating[] = ['SB', 'B', 'SB', 'B'];
              const calc = calculatePracticeAssessment(ratings[0], ratings[1], ratings[2], ratings[3]);
              practiceAssessments.push({
                id: `pra-${meetingId}-${std.id}`,
                meeting_id: meetingId,
                student_id: std.id,
                instruction_rating: ratings[0],
                assembly_accuracy_rating: ratings[1],
                robot_function_rating: ratings[2],
                neatness_part_rating: ratings[3],
                ...calc,
                notes: 'Praktik sangat baik',
                created_at: now,
                updated_at: now
              });
            }
          });
        }

        currentDate.setDate(currentDate.getDate() + 7);
        globalMeetingNum++;
      });

      // 12 Sessions LEGO WeDo
      legoWedoSessions.forEach((sess) => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const meetingId = `mtg-${schoolId}-${globalMeetingNum}`;

        meetings.push({
          id: meetingId,
          school_id: schoolId,
          academic_year_id: 'ay-2026-2027',
          semester_id: 'sem-1-2026',
          program_id: 'prog-lego-wedo',
          program_session_id: sess.id,
          meeting_number: globalMeetingNum,
          meeting_date: dateStr,
          start_time: '13:00',
          end_time: '14:30',
          topic_name: sess.topic_name,
          practice_1: sess.practice_1,
          practice_2: sess.practice_2,
          learning_outcome: sess.learning_outcome,
          status: 'scheduled',
          created_at: now,
          updated_at: now
        });

        currentDate.setDate(currentDate.getDate() + 7);
        globalMeetingNum++;
      });
    };

    generateSchoolMeetings('sch-1', 'Jumat', '2026-07-10');
    generateSchoolMeetings('sch-2', 'Senin', '2026-07-13');

    const auditLogs: AuditLog[] = [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        user_name: 'DIL Admin',
        action: 'Inisialisasi Sistem',
        details: 'Sistem ekstrakurikuler berhasil diinisialisasi dengan data 2 sekolah & 2 silabus utama.'
      }
    ];

    const settings: AppSettings = {
      app_name: 'Sistem Ekstrakurikuler Robotika & Coding',
      academic_year_default_id: 'ay-2026-2027',
      semester_default_id: 'sem-1-2026',
      practice_rating_weights: {
        SB: 25,
        B: 20,
        C: 15,
        PB: 10
      }
    };

    return {
      users: [user],
      schools,
      academic_years: academicYears,
      semesters,
      programs,
      program_sessions: [...robotDasarSessions, ...legoWedoSessions],
      semester_programs: semesterPrograms,
      school_programs: schoolPrograms,
      students,
      enrollments,
      meetings,
      attendances,
      practice_assessments: practiceAssessments,
      pretest_scores: pretestScores,
      meeting_notes: [],
      meeting_documentations: [],
      audit_logs: auditLogs,
      settings
    };
  }

  // Audit logger helper
  public addAuditLog(userName: string, action: string, details: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      user_name: userName,
      action,
      details
    };
    this.data.audit_logs.unshift(log);
    this.save();
  }
}

export const db = new JSONDatabase();
