import { useEffect, useState } from 'react';
import ridesService, { type PassengerRide, type RideStatus } from '../../services/rides';

const VEHICLE_ICONS: Record<string, string> = {
  tuktuk: '🛺',
  moto: '🏍️',
  car: '🚗',
  taxi: '🚕',
};

const STATUS_CONFIG: Record<RideStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-600 border-rose-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  accepted: { label: 'Accepted', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  ongoing: { label: 'In Progress', className: 'bg-sky-50 text-sky-600 border-sky-200' },
};

const HistoryTab = () => {
  const [rides, setRides] = useState<PassengerRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ridesService
      .getHistory()
      .then((data) => setRides([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(() => setError('Unable to load ride history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Page header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Ride History</h1>
        {!loading && !error && (
          <p className="text-sm text-slate-500 mt-0.5">{rides.length} {rides.length === 1 ? 'ride' : 'rides'} total</p>
        )}
      </div>

      {/* Content area */}
      <div className="px-4 pt-4 space-y-3">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading rides...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rides.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-4xl mb-4">
              🗺️
            </div>
            <p className="text-base font-bold text-slate-700">No rides yet</p>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Book your first ride and it will appear here
            </p>
          </div>
        )}

        {/* Ride cards */}
        {rides.map((ride) => {
          const cfg = STATUS_CONFIG[ride.status];
          const date = new Date(ride.createdAt);
          const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={ride._id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                {/* Top row: icon + type + status */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-slate-100">
                    {VEHICLE_ICONS[ride.vehicleType] ?? '🚗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 capitalize">{ride.vehicleType}</p>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{dateStr} · {timeStr}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="mt-3 pt-3 border-t border-slate-50">
                  {/* Stats row */}
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{ride.distance.toFixed(1)} km</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{ride.duration}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seats</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{ride.seats}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fare</p>
                      <p className="text-lg font-bold text-emerald-600 mt-0.5">${ride.price.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Driver info if available */}
                  {ride.driverId?.userId?.name && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                        {ride.driverId.userId.name[0]?.toUpperCase()}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{ride.driverId.userId.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryTab;
