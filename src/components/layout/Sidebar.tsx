import React, { useState } from 'react';
import {
  LayoutDashboard, School, CalendarDays, Layers, BookOpen,
  Users, Calendar, FileText, History, X, LogOut, UserCog, LogOut as LogOutIcon
} from 'lucide-react';
import { DilLogo } from '../common/DilLogo';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';
import { Modal } from '../common/Modal';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, isOpen, onClose }) => {
  const { user, setUser, showToast } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    apiService.logout();
    setUser(null);
    showToast('Berhasil keluar dari sistem.', 'info');
    onClose();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schools', label: 'Sekolah', icon: School },
    { id: 'academic-years', label: 'Tahun Ajaran', icon: CalendarDays },
    { id: 'semesters', label: 'Semester', icon: Layers },
    { id: 'programs', label: 'Program / Silabus', icon: BookOpen },
    { id: 'students', label: 'Siswa', icon: Users },
    { id: 'meetings', label: 'Pertemuan', icon: Calendar },
    { id: 'reports', label: 'Laporan & Rekap', icon: FileText },
    ...(user?.role === 'superadmin' ? [
      { id: 'users', label: 'Pengguna', icon: UserCog },
      { id: 'audit-logs', label: 'Audit Log', icon: History }
    ] : []),
  ];

  const isProfileActive = currentTab === 'profile' || currentTab === 'settings';
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar"
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-slate-100 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <DilLogo variant="dark" className="h-8 w-auto" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`menu-item-${item.id}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer with Profile & Logout Options */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          {/* Profile Navigation */}
          <button
            id="sidebar-profile-button"
            onClick={() => {
              setCurrentTab('profile');
              onClose();
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isProfileActive
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full font-extrabold flex items-center justify-center shrink-0 uppercase text-xs transition-all ${
                isProfileActive
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
              }`}
            >
              {userInitial}
            </div>
            <span>Profil</span>
          </button>

          {/* Logout Action */}
          <button
            id="sidebar-logout-button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-white" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Konfirmasi Keluar"
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-slate-600">
            Apakah Anda yakin ingin keluar dari sistem e-Ekstrakurikuler?
          </p>
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer flex items-center space-x-1.5"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              <span>Ya, Keluar</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
