import type { RideStatus } from '../services/rides';

interface RideStatusProps {
  status: RideStatus | null;
  driverName?: string | null;
  vehicleType?: string | null;
}

const STEPS: { label: string; description: string; threshold: number }[] = [
  { label: 'Finding Driver', description: 'Searching nearby drivers', threshold: 0 },
  { label: 'Driver Assigned', description: 'Driver confirmed your ride', threshold: 1 },
  { label: 'En Route', description: 'Driver heading to pickup', threshold: 2 },
  { label: 'Ride In Progress', description: 'On the way to destination', threshold: 3 },
  { label: 'Completed', description: 'You have arrived!', threshold: 4 },
];

const STATUS_STEP: Record<RideStatus, number> = {
  pending: 0,
  accepted: 2,
  ongoing: 3,
  completed: 4,
  cancelled: -1,
};

const STATUS_BADGE: Record<RideStatus, { label: string; className: string }> = {
  pending: { label: 'Searching', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  accepted: { label: 'Assigned', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  ongoing: { label: 'In Progress', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-600 border-rose-200' },
};

const RideStatusIndicator = ({ status, driverName, vehicleType }: RideStatusProps) => {
  if (!status) return null;

  const activeStep = STATUS_STEP[status];
  const badge = STATUS_BADGE[status];

  if (status === 'cancelled') {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-rose-500">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-bold text-rose-700">Ride Cancelled</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {driverName ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Driver</p>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{driverName}</p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-sm font-bold text-slate-700">Searching for driver...</p>
              </div>
            </>
          )}
          {vehicleType && (
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{vehicleType}</p>
          )}
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Progress steps */}
      <div className="px-4 py-3 space-y-0">
        {STEPS.map((step, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          const upcoming = index > activeStep;

          return (
            <div key={step.label} className="flex items-stretch gap-3">
              {/* Icon column */}
              <div className="flex flex-col items-center" style={{ width: 20 }}>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    done
                      ? 'bg-emerald-500'
                      : active
                      ? 'bg-emerald-500 ring-4 ring-emerald-100'
                      : 'bg-slate-100'
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="white" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  ) : active ? (
                    <span
                      className={`w-2 h-2 rounded-full bg-white ${
                        status === 'pending' ? 'animate-pulse' : ''
                      }`}
                    />
                  ) : null}
                </div>
                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 my-0.5 rounded-full transition-colors duration-300 ${
                      done ? 'bg-emerald-300' : 'bg-slate-100'
                    }`}
                    style={{ minHeight: 12 }}
                  />
                )}
              </div>

              {/* Label column */}
              <div className={`pb-3 pt-0.5 min-w-0 ${index === STEPS.length - 1 ? 'pb-0' : ''}`}>
                <p
                  className={`text-sm font-semibold leading-tight transition-colors duration-200 ${
                    done || active ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RideStatusIndicator;
