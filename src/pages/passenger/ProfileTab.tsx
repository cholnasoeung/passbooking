import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ChevronRight = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 fill-slate-300 ml-auto flex-shrink-0">
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

const ProfileTab = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Hero header with gradient */}
      <div
        className="px-4 pt-12 pb-8"
        style={{ background: 'linear-gradient(160deg, #10B981 0%, #00B14F 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{user?.name ?? 'Guest'}</h1>
            <p className="text-sm text-emerald-100 truncate">{user?.email ?? ''}</p>
            <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
              Passenger
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Account section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account</p>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 group">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-blue-500">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-slate-800">Edit Profile</p>
              <p className="text-xs text-slate-400 mt-0.5">Update your name and email</p>
            </div>
            <ChevronRight />
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-amber-500">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-slate-800">Change Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Update your security credentials</p>
            </div>
            <ChevronRight />
          </button>
        </div>

        {/* Preferences section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preferences</p>
          </div>

          {/* Dark mode toggle */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-slate-600">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Dark Mode</p>
              <p className="text-xs text-slate-400 mt-0.5">UI only — toggle appearance</p>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${darkMode ? 'bg-emerald-500' : 'bg-slate-200'}`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Notifications toggle */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-emerald-500">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-400 mt-0.5">Ride updates and alerts</p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOn(!notificationsOn)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${notificationsOn ? 'bg-emerald-500' : 'bg-slate-200'}`}
              aria-label="Toggle notifications"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${notificationsOn ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        {/* Support section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Support</p>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-purple-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-800">Help Center</span>
            <ChevronRight />
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-slate-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-800">About</span>
            <ChevronRight />
          </button>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl border border-rose-100 shadow-sm px-4 py-4 flex items-center justify-center gap-2 text-rose-600 font-bold text-sm hover:bg-rose-50 transition-colors"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Logout
        </button>

        <p className="text-center text-xs text-slate-400 pb-2">PassBooking · v1.0</p>
      </div>
    </div>
  );
};

export default ProfileTab;
