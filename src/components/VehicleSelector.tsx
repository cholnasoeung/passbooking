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
  taxi: '🚕'
};

const formatPrice = (vehicle: VehicleOption, distanceKm: number | null, seats: number) => {
  if (distanceKm == null) return '—';
  const price = vehicle.basePrice + distanceKm * vehicle.pricePerKm * seats;
  return `$${price.toFixed(2)}`;
};

const VehicleSelector = ({
  vehicles,
  selectedType,
  onSelect,
  distanceKm,
  durationText,
  seats,
  onSeatsChange,
  isLoading
}: VehicleSelectorProps) => {
  const selectedVehicle = vehicles.find((v) => v.type === selectedType);

  const handleSeatAdjust = (delta: number) => {
    if (!selectedVehicle) return;
    const next = Math.min(Math.max(seats + delta, 1), selectedVehicle.maxSeats);
    onSeatsChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {vehicles.map((vehicle) => {
          const isActive = vehicle.type === selectedType;
          return (
            <button
              key={vehicle._id}
              type="button"
              onClick={() => onSelect(vehicle.type)}
              className={`group relative flex flex-col gap-2 rounded-2xl border px-4 py-5 text-left transition-all focus:outline-none ${
                isActive
                  ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-3xl">{VEHICLE_ICONS[vehicle.type]}</span>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {vehicle.type}
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {vehicle.maxSeats} seats
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {durationText ? `${durationText} ride` : 'Duration unknown'}
              </p>
              <p className="text-lg font-bold text-slate-900">
                {formatPrice(vehicle, distanceKm, seats)}
              </p>
              <p className="text-xs text-slate-400">
                {durationText ? `ETA ${durationText}` : 'Awaiting destination'}
              </p>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>
                  {isActive ? 'Selected' : 'Tap to select'}
                </span>
                <span>Base ${vehicle.basePrice.toFixed(2)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedVehicle && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Seats</p>
              <p className="text-sm font-semibold text-slate-900">{seats} / {selectedVehicle.maxSeats}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSeatAdjust(-1)}
                disabled={seats <= 1 || isLoading}
                className="h-10 w-10 rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleSeatAdjust(1)}
                disabled={seats >= selectedVehicle.maxSeats || isLoading}
                className="h-10 w-10 rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Price updates instantly as you adjust seats or swap vehicle types.
          </p>
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
