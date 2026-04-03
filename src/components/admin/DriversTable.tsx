import type { AdminDriver } from '../../services/admin';

interface DriversTableProps {
  drivers: AdminDriver[];
  pendingAction: string | null;
  onApprove: (driverId: string) => void;
  onBlock: (driverId: string) => void;
  onEnable: (driverId: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const statusClasses: Record<AdminDriver['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200'
};

const DriversTable = ({
  drivers,
  pendingAction,
  onApprove,
  onBlock,
  onEnable
}: DriversTableProps) => {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="text-lg font-bold text-slate-900">Drivers Management</h3>
        <p className="mt-1 text-sm text-slate-500">
          Approve new drivers, block unsafe accounts, and monitor live availability.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <th className="px-6 py-4">Driver</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Availability</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No drivers found.
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => {
                    const isApproving = pendingAction === `approve-driver:${driver._id}`;
                    const isBlocking = pendingAction === `block-driver:${driver._id}`;
                    const isEnabling = pendingAction === `enable-driver:${driver._id}`;

                return (
                  <tr key={driver._id} className="align-top">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{driver.userId?.name || 'Unknown Driver'}</p>
                      <p className="mt-1 text-sm text-slate-500">{driver.userId?.email || 'No email'}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Joined {dateFormatter.format(new Date(driver.createdAt))}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusClasses[driver.status]}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        driver.isOnline
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}>
                        {driver.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {driver.currentLocation.lat.toFixed(4)}, {driver.currentLocation.lng.toFixed(4)}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => onApprove(driver._id)}
                          disabled={isApproving || isBlocking || driver.status === 'approved'}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isApproving ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEnable(driver._id)}
                          disabled={isEnabling || driver.status !== 'blocked'}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isEnabling ? 'Enabling...' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onBlock(driver._id)}
                          disabled={isBlocking || isApproving || driver.status === 'blocked'}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBlocking ? 'Blocking...' : 'Block'}
                        </button>
                      </div>
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

export default DriversTable;
