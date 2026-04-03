export type TabId = 'home' | 'history' | 'profile';

interface BottomTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const HistoryIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TABS = [
  { id: 'home' as TabId, label: 'Home', Icon: HomeIcon },
  { id: 'history' as TabId, label: 'History', Icon: HistoryIcon },
  { id: 'profile' as TabId, label: 'Profile', Icon: ProfileIcon },
];

const BottomTabs = ({ activeTab, onTabChange }: BottomTabsProps) => (
  <nav
    className="fixed bottom-0 inset-x-0 z-[1500] bg-white/95 backdrop-blur-md border-t border-slate-100"
    style={{ boxShadow: '0 -2px 20px rgba(0,0,0,0.07)' }}
  >
    <div className="flex items-stretch justify-around max-w-lg mx-auto">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-3 transition-all duration-200 ${
              active ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-emerald-500 rounded-full" />
            )}
            <span className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
              <Icon active={active} />
            </span>
            <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-200 ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomTabs;
