import type { AdminDashboardStats } from '../../services/admin';

interface StatsCardsProps {
  stats: AdminDashboardStats;
  isRefreshing?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

const statsConfig = [
  {
    key: 'totalUsers',
    label: 'Passengers',
    helper: 'Registered riders in the system',
    accent: 'from-sky-500/20 to-sky-500/5 text-sky-700'
  },
  {
    key: 'totalDrivers',
    label: 'Drivers',
    helper: 'Driver accounts managed by admin',
    accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-700'
  },
  {
    key: 'totalRides',
    label: 'Total Rides',
    helper: 'All booking records created',
    accent: 'from-violet-500/20 to-violet-500/5 text-violet-700'
  },
  {
    key: 'activeRides',
    label: 'Active Rides',
    helper: 'Pending, accepted, and ongoing trips',
    accent: 'from-amber-500/20 to-amber-500/5 text-amber-700'
  },
  {
    key: 'completedRides',
    label: 'Completed',
    helper: 'Trips finished successfully',
    accent: 'from-slate-500/20 to-slate-500/5 text-slate-700'
  },
  {
    key: 'totalRevenue',
    label: 'Revenue',
    helper: 'Sum of completed ride earnings',
    accent: 'from-rose-500/20 to-rose-500/5 text-rose-700'
  }
] as const;

const StatsCards = ({ stats, isRefreshing = false }: StatsCardsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dashboard stats</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Platform snapshot</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${isRefreshing ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
          {isRefreshing ? 'Refreshing data' : 'Live from backend'}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statsConfig.map((item) => {
          const rawValue = stats[item.key];
          const formattedValue = item.key === 'totalRevenue'
            ? currencyFormatter.format(rawValue)
            : rawValue.toLocaleString();

          return (
            <div
              key={item.key}
              className={`overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br ${item.accent} p-[1px] shadow-sm`}
            >
              <div className="h-full rounded-[calc(1.5rem-1px)] bg-white/95 p-5">
                <p className="text-sm font-semibold text-slate-600">{item.label}</p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{formattedValue}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.helper}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsCards;
