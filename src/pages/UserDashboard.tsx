import { useState } from 'react';
import BottomTabs, { type TabId } from '../components/layout/BottomTabs';
import HomeTab from './passenger/HomeTab';
import HistoryTab from './passenger/HistoryTab';
import ProfileTab from './passenger/ProfileTab';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50">
      {/*
       * Home tab stays mounted at all times so its polling intervals
       * (ride status, nearby drivers) keep running in the background.
       * We use opacity + pointer-events to show/hide it without unmounting.
       */}
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${
          activeTab === 'home' ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
        }`}
      >
        <HomeTab />
      </div>

      {/* History & Profile are lazily mounted — they have no background work */}
      {activeTab === 'history' && (
        <div className="absolute inset-0 overflow-y-auto bg-slate-50 z-20">
          <HistoryTab />
        </div>
      )}
      {activeTab === 'profile' && (
        <div className="absolute inset-0 overflow-y-auto bg-slate-50 z-20">
          <ProfileTab />
        </div>
      )}

      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default UserDashboard;
