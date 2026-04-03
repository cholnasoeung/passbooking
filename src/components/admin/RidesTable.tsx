import type { AdminRide } from '../../services/admin';

interface RidesTableProps {
  rides: AdminRide[];
  pendingAction: string | null;
  onDelete: (rideId: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

const statusClasses: Record<AdminRide['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  accepted: 'bg-sky-50 text-sky-700 ring-sky-200',
  ongoing: 'bg-violet-50 text-violet-700 ring-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
};

const RidesTable = ({
  rides,
  pendingAction,
  onDelete
}: RidesTableProps) => {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="text-lg font-bold text-slate-900">Rides Management</h3>
        <p className="mt-1 text-sm text-slate-500">
          Audit trip records, monitor rider-driver pairing, and remove invalid bookings.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <th className="px-6 py-4">Ride</th>
              <th className="px-6 py-4">Passenger</th>
              <th className="px-6 py-4">Driver</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Fare</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rides.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                  No rides found.
                </td>
              </tr>
            ) : (
              rides.map((ride) => {
                const isDeleting = pendingAction === `delete-ride:${ride._id}`;

                return (
                  <tr key={ride._id} className="align-top">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">Ride {ride._id.slice(-6).toUpperCase()}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {ride.distance.toFixed(1)} km • {ride.duration}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {dateFormatter.format(new Date(ride.createdAt))}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{ride.userId?.name || 'Deleted user'}</p>
                      <p className="mt-1 text-sm text-slate-500">{ride.userId?.email || 'Unavailable'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">
                        {ride.driverId?.userId?.name || 'Unassigned'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {ride.driverId?.userId?.email || 'No driver linked'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusClasses[ride.status]}`}>
                        {ride.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{currencyFormatter.format(ride.price)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ride.pickup.lat.toFixed(3)}, {ride.pickup.lng.toFixed(3)} to {ride.destination.lat.toFixed(3)}, {ride.destination.lng.toFixed(3)}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(ride._id)}
                        disabled={isDeleting}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RidesTable;
