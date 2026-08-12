import {
  User, School, AcademicYear, Semester, Program, ProgramSession,
  Student, Meeting, Attendance, PracticeAssessment, PretestScore,
  DashboardStats, AuditLog, AppSettings, PracticeRating, AttendanceStatus
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: 'Terjadi kesalahan pada server.' }));
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    throw new Error(errData.message || `Error ${res.status}`);
  }

  return res.json();
}

export const apiService = {
  // Auth
  login: async (username: string, password: string) => {
    const res = await request<{ message: string; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    return res;
  },

  getCurrentUser: async () => {
    return request<{ user: User }>('/auth/me');
  },

  updateProfile: async (data: { name?: string; username?: string; email?: string; password?: string }) => {
    const res = await request<{ message: string; user: User; token: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res.token) {
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
    }
    return res;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  // Users Management (Super Admin)
  getUsers: async () => request<User[]>('/users'),
  createUser: async (data: { name: string; username: string; role?: string; password?: string }) =>
    request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateUser: async (id: string, data: { name?: string; username?: string; role?: string; password?: string }) =>
    request<{ message: string; user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteUser: async (id: string) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE'
    }),

  // Schools
  getSchools: async () => request<School[]>('/schools'),
  getSchool: async (id: string) => request<School>(`/schools/${id}`),
  createSchool: async (data: Partial<School>) => request<School>('/schools', { method: 'POST', body: JSON.stringify(data) }),
  updateSchool: async (id: string, data: Partial<School>) => request<School>(`/schools/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleSchoolActive: async (id: string) => request<School>(`/schools/${id}/toggle-active`, { method: 'PATCH' }),

  // Academic Years
  getAcademicYears: async () => request<AcademicYear[]>('/academic-years'),
  createAcademicYear: async (data: Partial<AcademicYear>) => request<AcademicYear>('/academic-years', { method: 'POST', body: JSON.stringify(data) }),
  updateAcademicYear: async (id: string, data: Partial<AcademicYear>) => request<AcademicYear>(`/academic-years/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setActiveAcademicYear: async (id: string) => request<{ message: string }>(`/academic-years/${id}/set-active`, { method: 'PATCH' }),

  // Semesters
  getSemesters: async () => request<Semester[]>('/semesters'),
  createSemester: async (data: Partial<Semester>) => request<Semester>('/semesters', { method: 'POST', body: JSON.stringify(data) }),
  setActiveSemester: async (id: string) => request<{ message: string }>(`/semesters/${id}/set-active`, { method: 'PATCH' }),

  // Programs / Syllabus
  getPrograms: async () => request<Program[]>('/programs'),
  getProgram: async (id: string) => request<Program & { sessions: ProgramSession[] }>(`/programs/${id}`),
  createProgram: async (data: Partial<Program>) => request<Program>('/programs', { method: 'POST', body: JSON.stringify(data) }),
  updateProgram: async (id: string, data: Partial<Program>) => request<Program>(`/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateProgram: async (id: string) => request<Program>(`/programs/${id}/duplicate`, { method: 'POST' }),
  deleteProgram: async (id: string) => request<{ message: string }>(`/programs/${id}`, { method: 'DELETE' }),
  cleanDuplicatePrograms: async () => request<{ message: string; removedCount: number }>('/programs/clean-duplicates', { method: 'POST' }),

  // Sessions
  getSessions: async (programId: string) => request<ProgramSession[]>(`/programs/${programId}/sessions`),
  createSession: async (programId: string, data: Partial<ProgramSession>) => request<ProgramSession>(`/programs/${programId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSession: async (id: string, data: Partial<ProgramSession>) => request<ProgramSession>(`/program-sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: async (id: string) => request<{ message: string }>(`/program-sessions/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: async (params?: { school_id?: string; class_name?: string; is_active?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.school_id) query.append('school_id', params.school_id);
    if (params?.class_name) query.append('class_name', params.class_name);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params?.search) query.append('search', params.search);
    return request<Student[]>(`/students?${query.toString()}`);
  },
  getStudentDetail: async (id: string) => request<Student & { school_name: string; enrollments: any[]; attendances: Attendance[]; pretestScores: PretestScore[]; practiceAssessments: PracticeAssessment[] }>(`/students/${id}`),
  createStudent: async (data: Partial<Student>) => request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: async (id: string, data: Partial<Student>) => request<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: async (id: string) => request<{ message: string }>(`/students/${id}`, { method: 'DELETE' }),
  cleanDuplicateStudents: async () => request<{ message: string; removedCount: number }>('/students/clean-duplicates', { method: 'POST' }),
  toggleStudentActive: async (id: string) => request<Student>(`/students/${id}/toggle-active`, { method: 'PATCH' }),
  importStudents: async (school_id: string, students: any[]) => request<{ message: string; insertedCount: number; errors: string[] }>('/students/import-json', { method: 'POST', body: JSON.stringify({ school_id, students }) }),

  // Meetings
  getMeetings: async (params?: { school_id?: string; academic_year_id?: string; semester_id?: string; program_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.school_id) query.append('school_id', params.school_id);
    if (params?.academic_year_id) query.append('academic_year_id', params.academic_year_id);
    if (params?.semester_id) query.append('semester_id', params.semester_id);
    if (params?.program_id) query.append('program_id', params.program_id);
    if (params?.status) query.append('status', params.status);
    return request<(Meeting & { school_name: string; program_name: string })[]>(`/meetings?${query.toString()}`);
  },
  getMeetingDetail: async (id: string) => request<Meeting & {
    school_name: string;
    day_of_week: string;
    program_name: string;
    students: Student[];
    attendances: Attendance[];
    pretestScores: PretestScore[];
    practiceAssessments: PracticeAssessment[];
    notes: any[];
    documentations: any[];
  }>(`/meetings/${id}`),
  generateWeeklyMeetings: async (school_id: string, semester_id: string, start_date: string) => request<{ message: string; count: number }>('/meetings/generate-weekly', { method: 'POST', body: JSON.stringify({ school_id, semester_id, start_date }) }),
  updateMeeting: async (id: string, data: Partial<Meeting>) => request<Meeting>(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Attendance & Assessments
  saveAttendance: async (meetingId: string, attendances: { student_id: string; status: AttendanceStatus; notes?: string }[]) => request<{ message: string }>(`/meetings/${meetingId}/attendance`, { method: 'POST', body: JSON.stringify({ attendances }) }),
  savePretest: async (meetingId: string, pretests: { student_id: string; score: number | null; notes?: string }[]) => request<{ message: string }>(`/meetings/${meetingId}/pretest`, { method: 'POST', body: JSON.stringify({ pretests }) }),
  savePracticeAssessments: async (meetingId: string, assessments: {
    student_id: string;
    instruction_rating: PracticeRating;
    assembly_accuracy_rating: PracticeRating;
    robot_function_rating: PracticeRating;
    neatness_part_rating: PracticeRating;
    notes?: string;
  }[]) => request<{ message: string }>(`/meetings/${meetingId}/practice-assessments`, { method: 'POST', body: JSON.stringify({ assessments }) }),
  addMeetingNote: async (meetingId: string, note_text: string) => request<any>(`/meetings/${meetingId}/notes`, { method: 'POST', body: JSON.stringify({ note_text }) }),
  addMeetingDocumentation: async (meetingId: string, title: string, file_url: string) => request<any>(`/meetings/${meetingId}/documentation`, { method: 'POST', body: JSON.stringify({ title, file_url }) }),

  // Dashboard & Reports
  getDashboardStats: async (school_id?: string) => {
    const q = school_id && school_id !== 'all' ? `?school_id=${school_id}` : '';
    return request<DashboardStats>(`/dashboard/stats${q}`);
  },
  getReportSummary: async (school_id?: string, semester_id?: string) => {
    const query = new URLSearchParams();
    if (school_id && school_id !== 'all') query.append('school_id', school_id);
    if (semester_id) query.append('semester_id', semester_id);
    return request<any[]>(`/reports/summary?${query.toString()}`);
  },

  // Audit Logs & Settings
  getAuditLogs: async () => request<AuditLog[]>('/audit-logs'),
  getSettings: async () => request<AppSettings>('/settings'),
  updateSettings: async (settings: Partial<AppSettings>) => request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(settings) })
};
