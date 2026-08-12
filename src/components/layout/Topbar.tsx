import React from 'react';
import { Menu, School as SchoolIcon, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const {
    user,
    selectedSchoolId,
    setSelectedSchoolId,
    schools,
    activeAcademicYear,
    activeSemester,
  } = useApp();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global School Selector */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition-colors">
          <SchoolIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Sekolah:</span>
            <select
              id="global-school-selector"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Semua Sekolah ({schools.length})</option>
              {schools.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.name} ({sch.day_of_week})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right: Academic Context & User Badge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Academic Year & Semester Pill */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-medium">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {activeAcademicYear ? activeAcademicYear.name : '2026/2027'} - {activeSemester ? activeSemester.name : 'Semester 1'}
          </span>
        </div>

        {/* User Badge */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center shrink-0 uppercase text-xs shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Admin'}</p>
            <p className="text-[10px] font-medium text-slate-500 capitalize">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
