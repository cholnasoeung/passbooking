import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar, { type AdminSection } from '../components/admin/AdminSidebar';
import DriversTable from '../components/admin/DriversTable';
import RidesTable from '../components/admin/RidesTable';
import StatsCards from '../components/admin/StatsCards';
import UsersTable from '../components/admin/UsersTable';
import { useAuth } from '../context/AuthContext';
import adminService, {
  type AdminDashboardStats,
  type AdminDriver,
  type AdminRide,
  type AdminUser,
  type UserRole
} from '../services/admin';

const getErrorMessage = (error: unknown, fallback: string) => {
  return (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message || fallback;
};

const sectionMeta: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: 'Overview',
    description: 'Track usage, open ride volume, and the overall health of the platform.'
  },
  users: {
    title: 'Users Management',
    description: 'Update account roles and remove accounts that should no longer access the app.'
  },
  drivers: {
    title: 'Drivers Management',
    description: 'Review new driver accounts, approve trusted drivers, and block unsafe ones.'
  },
  rides: {
    title: 'Rides Management',
    description: 'Inspect trip history and clean out invalid or unwanted booking records.'
  }
};

const emptyStats: AdminDashboardStats = {
  totalUsers: 0,
  totalDrivers: 0,
  totalRides: 0,
  activeRides: 0,
  completedRides: 0,
  totalRevenue: 0
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [stats, setStats] = useState<AdminDashboardStats>(emptyStats);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [rides, setRides] = useState<AdminRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadDashboardData = async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [statsResponse, usersResponse, driversResponse, ridesResponse] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUsers(),
        adminService.getDrivers(),
        adminService.getRides()
      ]);

      setStats(statsResponse);
      setUsers(usersResponse);
      setDrivers(driversResponse);
      setRides(ridesResponse);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'Failed to load admin dashboard data')
      });
    } finally {
      if (showLoader) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void loadDashboardData(true);
  }, []);

  const runAction = async (
    actionKey: string,
    successMessage: string,
    action: () => Promise<void>
  ) => {
    setPendingAction(actionKey);
    setFeedback(null);

    try {
      await action();
      await loadDashboardData(false);
      setFeedback({ type: 'success', message: successMessage });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'The requested admin action failed')
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteUser = (userId: string) => {
    void runAction(`delete-user:${userId}`, 'User deleted successfully', async () => {
      await adminService.deleteUser(userId);
    });
  };

  const handleUpdateRole = (userId: string, role: UserRole) => {
    void runAction(`update-role:${userId}`, 'User role updated successfully', async () => {
      await adminService.updateUserRole(userId, role);
    });
  };

  const handleApproveDriver = (driverId: string) => {
    void runAction(`approve-driver:${driverId}`, 'Driver approved successfully', async () => {
      await adminService.approveDriver(driverId);
    });
  };

  const handleBlockDriver = (driverId: string) => {
    void runAction(`block-driver:${driverId}`, 'Driver blocked successfully', async () => {
      await adminService.blockDriver(driverId);
    });
  };

  const handleDeleteRide = (rideId: string) => {
    void runAction(`delete-ride:${rideId}`, 'Ride deleted successfully', async () => {
      await adminService.deleteRide(rideId);
    });
  };

  const pendingDriverApprovals = drivers.filter((driver) => driver.isApproved === false && !driver.isBlocked).length;
  const blockedDrivers = drivers.filter((driver) => driver.isBlocked).length;
  const openRides = rides.filter((ride) => ride.status !== 'completed').length;
  const recentRides = rides.slice(0, 5);

  const renderSectionContent = () => {
    if (activeSection === 'users') {
      return (
        <UsersTable
          users={users}
          currentUserId={user?.id}
          pendingAction={pendingAction}
          onDelete={handleDeleteUser}
          onRoleChange={handleUpdateRole}
        />
      );
    }

    if (activeSection === 'drivers') {
      return (
        <DriversTable
          drivers={drivers}
          pendingAction={pendingAction}
          onApprove={handleApproveDriver}
          onBlock={handleBlockDriver}
        />
      );
    }

    if (activeSection === 'rides') {
      return (
        <RidesTable
          rides={rides}
          pendingAction={pendingAction}
          onDelete={handleDeleteRide}
        />
      );
    }

    return (
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-lg font-bold text-slate-900">Recent Ride Activity</h3>
            <p className="mt-1 text-sm text-slate-500">
              Latest trip records across the booking system.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRides.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No ride activity yet.
              </div>
            ) : (
              recentRides.map((ride) => (
                <div key={ride._id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {ride.userId?.name || 'Deleted user'} to {ride.driverId?.userId?.name || 'Unassigned driver'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {ride.distance.toFixed(1)} km • {ride.duration} • ${ride.price.toFixed(2)}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${
                    ride.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : ride.status === 'ongoing'
                        ? 'bg-violet-50 text-violet-700 ring-violet-200'
                        : ride.status === 'accepted'
                          ? 'bg-sky-50 text-sky-700 ring-sky-200'
                          : 'bg-amber-50 text-amber-700 ring-amber-200'
                  }`}>
                    {ride.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ops focus</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-800">Pending approvals</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{pendingDriverApprovals}</p>
                <p className="mt-1 text-sm text-amber-700">Drivers waiting for admin review.</p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-800">Blocked drivers</p>
                <p className="mt-2 text-3xl font-bold text-rose-900">{blockedDrivers}</p>
                <p className="mt-1 text-sm text-rose-700">Accounts removed from active dispatch.</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-4">
                <p className="text-sm font-semibold text-sky-800">Open rides</p>
                <p className="mt-2 text-3xl font-bold text-sky-900">{openRides}</p>
                <p className="mt-1 text-sm text-sky-700">Trips still in progress or awaiting completion.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Role mix</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <p className="text-sm font-semibold text-slate-600">Passengers</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <p className="text-sm font-semibold text-slate-600">Drivers</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalDrivers}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <p className="text-sm font-semibold text-slate-600">Admins</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {users.filter((account) => account.role === 'admin').length}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
          <p className="text-sm text-slate-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 text-slate-900">
      <div className="flex h-full flex-col lg:flex-row">
        <AdminSidebar
          activeSection={activeSection}
          adminName={user?.name}
          onSectionChange={setActiveSection}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <header className="flex flex-col gap-4 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Operations dashboard</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{sectionMeta[activeSection].title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {sectionMeta[activeSection].description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadDashboardData(false)}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </header>

              {feedback && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}>
                  {feedback.message}
                </div>
              )}

              <StatsCards stats={stats} isRefreshing={isRefreshing} />
              {renderSectionContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
