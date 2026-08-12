import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, School, AcademicYear, Semester } from '../types';
import { apiService } from '../services/api';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  selectedSchoolId: string; // 'all' or school.id
  setSelectedSchoolId: (id: string) => void;
  schools: School[];
  refreshSchools: () => Promise<void>;
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | null;
  semesters: Semester[];
  activeSemester: Semester | null;
  refreshAcademicInfo: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [schools, setSchools] = useState<School[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshSchools = async () => {
    if (!user) return;
    try {
      const data = await apiService.getSchools();
      setSchools(data);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAcademicInfo = async () => {
    if (!user) return;
    try {
      const [ays, sems] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getSemesters()
      ]);
      setAcademicYears(ays);
      setSemesters(sems);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      refreshSchools();
      refreshAcademicInfo();
    }
  }, [user]);

  const activeAcademicYear = academicYears.find(a => a.status === 'active') || academicYears[0] || null;
  const activeSemester = semesters.find(s => s.status === 'active') || semesters[0] || null;

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      selectedSchoolId,
      setSelectedSchoolId,
      schools,
      refreshSchools,
      academicYears,
      activeAcademicYear,
      semesters,
      activeSemester,
      refreshAcademicInfo,
      toast,
      showToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
