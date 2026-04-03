export type AdminSection = 'overview' | 'users' | 'drivers' | 'rides' | 'vehicles';

interface AdminSidebarProps {
  activeSection: AdminSection;
  adminName?: string;
  onSectionChange: (section: AdminSection) => void;
  onLogout: () => void;
}

const navItems: Array<{
  id: AdminSection;
  label: string;
  caption: string;
}> = [
  { id: 'overview', label: 'Overview', caption: 'KPIs & platform health' },
  { id: 'users', label: 'Users', caption: 'Accounts & permissions' },
  { id: 'drivers', label: 'Drivers', caption: 'Approvals & blocking' },
  { id: 'rides', label: 'Rides', caption: 'Trip records & cleanup' },
  { id: 'vehicles', label: 'Vehicles', caption: 'Fares & seat setup' }
];

const AdminSidebar = ({
  activeSection,
  adminName,
  onSectionChange,
  onLogout
}: AdminSidebarProps) => {
  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950 text-white lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Admin Control
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">TukTuk Ops</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage riders, drivers, rides, and system growth from one control room.
          </p>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Signed in as</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{adminName || 'Administrator'}</p>
          </div>
        </div>

        <nav className="overflow-x-auto px-3 py-4 lg:flex-1 lg:overflow-y-auto">
          <div className="flex gap-2 lg:flex-col">
            {navItems.map((item) => {
              const isActive = item.id === activeSection;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={`min-w-[180px] rounded-2xl border px-4 py-3 text-left transition-all lg:min-w-0 ${
                    isActive
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-white shadow-lg shadow-emerald-900/30'
                      : 'border-transparent bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className={`mt-1 text-xs ${isActive ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {item.caption}
                  </p>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
