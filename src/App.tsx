import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchoolsPage } from './pages/SchoolsPage';
import { SchoolDetailPage } from './pages/SchoolDetailPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { AcademicYearsPage } from './pages/AcademicYearsPage';
import { SemestersPage } from './pages/SemestersPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { ProgramDetailPage } from './pages/ProgramDetailPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';

const AppContent: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDetailId, setSelectedDetailId] = useState<string>('');
  const [presetSchoolFilter, setPresetSchoolFilter] = useState<string>('');

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (tab: string, detailId?: string) => {
    if (tab === 'meetings-school' && detailId) {
      setActiveTab('meetings');
      setPresetSchoolFilter(detailId);
      return;
    }
    setPresetSchoolFilter('');
    if (detailId) {
      setSelectedDetailId(detailId);
    }
    setActiveTab(tab);
  };

  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'schools':
        return <SchoolsPage onSelectSchoolDetail={(id) => handleNavigate('school-detail', id)} />;
      case 'school-detail':
        return (
          <SchoolDetailPage
            schoolId={selectedDetailId}
            onBack={() => setActiveTab('schools')}
            onNavigate={handleNavigate}
          />
        );
      case 'students':
        return <StudentsPage onSelectStudentDetail={(id) => handleNavigate('student-detail', id)} />;
      case 'student-detail':
        return <StudentDetailPage studentId={selectedDetailId} onBack={() => setActiveTab('students')} />;
      case 'academic-years':
        return <AcademicYearsPage />;
      case 'semesters':
        return <SemestersPage />;
      case 'programs':
        return <ProgramsPage onSelectProgramDetail={(id) => handleNavigate('program-detail', id)} />;
      case 'program-detail':
        return <ProgramDetailPage programId={selectedDetailId} onBack={() => setActiveTab('programs')} />;
      case 'meetings':
        return (
          <MeetingsPage
            onSelectMeetingDetail={(id) => handleNavigate('meeting-detail', id)}
            presetSchoolId={presetSchoolFilter}
          />
        );
      case 'meeting-detail':
        return <MeetingDetailPage meetingId={selectedDetailId} onBack={() => setActiveTab('meetings')} />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'logs':
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'profile':
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderCurrentView()}
    </Layout>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
