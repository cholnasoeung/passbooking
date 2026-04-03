import type { VehicleOption } from '../services/vehicles';

interface VehicleSelectorProps {
  vehicles: VehicleOption[];
  selectedType: VehicleOption['type'] | null;
  onSelect: (type: VehicleOption['type']) => void;
  distanceKm: number | null;
  durationText: string | null;
  seats: number;
  onSeatsChange: (value: number) => void;
  isLoading?: boolean;
}

const VEHICLE_ICONS: Record<VehicleOption['type'], string> = {
  tuktuk: '🛺',
  moto: '🏍️',
  car: '🚗',
  taxi: '🚕',
};

const VEHICLE_LABELS: Record<VehicleOption['type'], string> = {
  tuktuk: 'TukTuk',
  moto: 'Moto',
  car: 'Car',
  taxi: 'Taxi',
};

const formatPrice = (vehicle: VehicleOption, distanceKm: number | null, seats: number) => {
  if (distanceKm == null) return '—';
  return `$${(vehicle.basePrice + distanceKm * vehicle.pricePerKm * seats).toFixed(2)}`;
};

const VehicleSelector = ({
  vehicles,
  selectedType,
  onSelect,
  distanceKm,
  durationText,
  seats,
  onSeatsChange,
  isLoading,
}: VehicleSelectorProps) => {
  const selectedVehicle = vehicles.find((v) => v.type === selectedType) ?? null;

  const handleSeatAdjust = (delta: number) => {
    if (!selectedVehicle) return;
    onSeatsChange(Math.min(Math.max(seats + delta, 1), selectedVehicle.maxSeats));
  };

  if (vehicles.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section label */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-0.5">Choose vehicle</p>

      {/* Horizontal scroll vehicle cards */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-0.5 px-0.5">
        {vehicles.map((vehicle) => {
          const active = vehicle.type === selectedType;
          const price = formatPrice(vehicle, distanceKm, seats);

          return (
            <button
              key={vehicle._id}
              type="button"
              onClick={() => onSelect(vehicle.type)}
              className={`flex-shrink-0 w-[130px] snap-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                active
                  ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-white shadow-md shadow-emerald-100 ring-1 ring-emerald-300'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2 leading-none">{VEHICLE_ICONS[vehicle.type]}</div>
              <p className={`text-xs font-bold uppercase tracking-wider leading-none ${active ? 'text-emerald-700' : 'text-slate-700'}`}>
                {VEHICLE_LABELS[vehicle.type]}
              </p>
              <p className={`text-base font-bold mt-1.5 ${active ? 'text-emerald-800' : 'text-slate-900'}`}>
                {price}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                {durationText ? `~${durationText}` : 'Set destination'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Up to {vehicle.maxSeats} seats
              </p>
              {active && (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Seat selector */}
      {selectedVehicle && (
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Passengers</p>
            <p className="text-xs text-slate-500 mt-0.5">Max {selectedVehicle.maxSeats} seats</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSeatAdjust(-1)}
              disabled={seats <= 1 || isLoading}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shadow-sm transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="w-6 text-center text-base font-bold text-slate-900 tabular-nums">{seats}</span>
            <button
              type="button"
              onClick={() => handleSeatAdjust(1)}
              disabled={seats >= selectedVehicle.maxSeats || isLoading}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shadow-sm transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
