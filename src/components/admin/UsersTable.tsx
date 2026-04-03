import type { AdminUser, UserRole } from '../../services/admin';

interface UsersTableProps {
  users: AdminUser[];
  currentUserId?: string;
  pendingAction: string | null;
  onDelete: (userId: string) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const roleClasses: Record<UserRole, string> = {
  user: 'bg-sky-50 text-sky-700 ring-sky-200',
  driver: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  admin: 'bg-violet-50 text-violet-700 ring-violet-200'
};

const UsersTable = ({
  users,
  currentUserId,
  pendingAction,
  onDelete,
  onRoleChange
}: UsersTableProps) => {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="text-lg font-bold text-slate-900">Users Management</h3>
        <p className="mt-1 text-sm text-slate-500">
          Review platform accounts, change access levels, and remove users when needed.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isCurrentUser = user._id === currentUserId;
                const isDeleting = pendingAction === `delete-user:${user._id}`;
                const isUpdatingRole = pendingAction === `update-role:${user._id}`;

                return (
                  <tr key={user._id} className="align-top">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        ID {user._id.slice(-6).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${roleClasses[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {dateFormatter.format(new Date(user.createdAt))}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-end gap-3">
                        <select
                          value={user.role}
                          disabled={isCurrentUser || isUpdatingRole || isDeleting}
                          onChange={(event) => {
                            const nextRole = event.target.value as UserRole;

                            if (nextRole !== user.role) {
                              onRoleChange(user._id, nextRole);
                            }
                          }}
                          className="w-full max-w-[140px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                        >
                          <option value="user">user</option>
                          <option value="driver">driver</option>
                          <option value="admin">admin</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => onDelete(user._id)}
                          disabled={isCurrentUser || isDeleting || isUpdatingRole}
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleting ? 'Deleting...' : isCurrentUser ? 'Current Admin' : 'Delete'}
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

export default UsersTable;
