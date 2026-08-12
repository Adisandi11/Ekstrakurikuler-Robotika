export type Role = 'superadmin' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  logo?: string;
  day_of_week: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  start_time: string; // e.g. "13:00"
  end_time: string;   // e.g. "14:30"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2026/2027"
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  academic_year_id: string;
  name: string; // e.g. "Semester 1", "Semester 2"
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  duration_months: number;
  total_sessions: number;
  session_duration_minutes: number;
  target_participants: string;
  method: string;
  media: string;
  learning_objectives: string[];
  competencies: string[];
  passing_criteria?: string;
  output_program?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ProgramSession {
  id: string;
  program_id: string;
  session_number: number; // 1 to 12
  topic_name: string;
  practice_1: string;
  practice_2?: string;
  learning_outcome: string;
  created_at: string;
  updated_at: string;
}

export interface SemesterProgram {
  id: string;
  semester_id: string;
  program_id: string;
  sequence_order: number; // 1, 2, ...
  start_period?: string;
  end_period?: string;
}

export interface SchoolProgram {
  id: string;
  school_id: string;
  academic_year_id: string;
  semester_id: string;
  program_id: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  student_number: string; // NIS
  nisn?: string;
  full_name: string;
  gender: 'L' | 'P';
  class_name: string;
  school_id: string;
  birth_date?: string;
  parent_name?: string;
  parent_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  school_id: string;
  academic_year_id: string;
  semester_id: string;
  class_name: string;
  status: 'active' | 'inactive' | 'graduated';
  created_at: string;
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';

export interface Meeting {
  id: string;
  school_id: string;
  academic_year_id: string;
  semester_id: string;
  program_id: string;
  program_session_id?: string;
  meeting_number: number; // 1 to 24
  meeting_date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  topic_name: string;
  practice_1: string;
  practice_2?: string;
  learning_outcome: string;
  status: MeetingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpha';

export interface Attendance {
  id: string;
  meeting_id: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PracticeRating = 'SB' | 'B' | 'C' | 'PB';

export interface PracticeAssessment {
  id: string;
  meeting_id: string;
  student_id: string;
  instruction_rating: PracticeRating;
  assembly_accuracy_rating: PracticeRating;
  robot_function_rating: PracticeRating;
  neatness_part_rating: PracticeRating;
  instruction_score: number;
  assembly_accuracy_score: number;
  robot_function_score: number;
  neatness_part_score: number;
  total_score: number;
  predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PretestScore {
  id: string;
  meeting_id: string;
  student_id: string;
  score: number | null; // 0-100 or null if absent
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
}

export interface MeetingDocumentation {
  id: string;
  meeting_id: string;
  title: string;
  file_url: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_name: string;
  action: string;
  details: string;
}

export interface AppSettings {
  app_name: string;
  academic_year_default_id: string;
  semester_default_id: string;
  practice_rating_weights: {
    SB: number;
    B: number;
    C: number;
    PB: number;
  };
}

export interface DashboardStats {
  total_schools: number;
  total_students: number;
  total_semester_meetings: number;
  completed_meetings: number;
  upcoming_meeting: {
    id: string;
    school_name: string;
    day_of_week: string;
    time: string;
    meeting_number: number;
    topic_name: string;
    date: string;
  } | null;
  attendance_percentage: number;
  average_practice_score: number;
  school_progress: {
    school_id: string;
    school_name: string;
    programs: {
      program_name: string;
      completed: number;
      total: number;
    }[];
  }[];
  recent_activities: AuditLog[];
}
