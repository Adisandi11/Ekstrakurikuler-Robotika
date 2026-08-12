import React, { useState, useEffect } from 'react';
import { History, Activity, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogsPage: React.FC = () => {
  const { user: currentUser } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'superadmin') {
      loadLogs();
    }
  }, [currentUser]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3 max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-900">Akses Ditolak</h2>
        <p className="text-xs text-red-700">
          Halaman Audit Activity Log ini hanya dapat diakses oleh akun dengan role Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900">Audit Activity Log</h2>
        <p className="text-xs text-slate-500 mt-1">Catatan histori aktivitas penting pengelola sistem.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-start justify-between text-xs hover:bg-slate-50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900">{log.user_name}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md border border-indigo-100">
                    {log.action}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">{log.details}</p>
              </div>

              <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-4">
                {new Date(log.timestamp).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
