import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  const bgStyles = {
    success: 'bg-slate-900 text-white border-slate-700',
    error: 'bg-red-900 text-white border-red-700',
    info: 'bg-indigo-900 text-white border-indigo-700'
  }[type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }[type];

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium animate-bounce ${bgStyles}`}>
      <Icon className="w-5 h-5 text-indigo-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
