import type { RideStatus } from '../services/rides';

interface RideStatusProps {
  status: RideStatus | null;
  driverName?: string | null;
  vehicleType?: string | null;
}

const steps = [
  { label: 'Searching', key: 'pending' },
  { label: 'Driver Assigned', key: 'accepted' },
  { label: 'Driver Arriving', key: 'accepted' },
  { label: 'Ride Ongoing', key: 'ongoing' },
  { label: 'Completed', key: 'completed' }
];

const statusIndex: Record<RideStatus, number> = {
  pending: 0,
  accepted: 2,
  ongoing: 3,
  completed: 4,
  cancelled: 0
};

const RideStatusIndicator = ({ status, driverName, vehicleType }: RideStatusProps) => {
  if (!status) {
    return null;
  }

  const activeIndex = statusIndex[status];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Ride status</p>
          <p className="text-sm text-slate-700">
            {driverName ? `Driver ${driverName}` : 'Searching for driver'}
            {vehicleType ? ` • ${vehicleType}` : ''}
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500">{status.toUpperCase()}</span>
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full border ${
                index <= activeIndex ? 'border-emerald-400 bg-emerald-400' : 'border-slate-200 bg-white'
              }`}
            />
            <p className={`text-sm ${index <= activeIndex ? 'text-slate-900' : 'text-slate-400'}`}>
              {step.label}
            </p>
            {step.label === 'Driver Arriving' && driverName && status === 'accepted' && (
              <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                en route
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RideStatusIndicator;
