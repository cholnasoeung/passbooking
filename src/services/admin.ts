import api from './api';

export type UserRole = 'user' | 'driver' | 'admin';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDriver {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt?: string;
  } | null;
  isOnline: boolean;
  isApproved?: boolean;
  isBlocked?: boolean;
  currentLocation: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'approved' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface AdminRide {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  driverId: {
    _id: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  pickup: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  distance: number;
  duration: string;
  price: number;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AdminVehicle {
  _id: string;
  type: 'tuktuk' | 'moto' | 'car' | 'taxi';
  basePrice: number;
  pricePerKm: number;
  maxSeats: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePayload {
  type: AdminVehicle['type'];
  basePrice: number;
  pricePerKm: number;
  maxSeats: number;
  enabled?: boolean;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalRevenue: number;
}

const adminService = {
  async getDashboardStats() {
    const response = await api.get<AdminDashboardStats>('/admin/stats');
    return response.data;
  },

  async getUsers() {
    const response = await api.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  async deleteUser(userId: string) {
    await api.delete(`/admin/users/${userId}`);
  },

  async updateUserRole(userId: string, role: UserRole) {
    const response = await api.put<{ user: AdminUser }>(`/admin/users/${userId}/role`, { role });
    return response.data.user;
  },

  async getDrivers() {
    const response = await api.get<AdminDriver[]>('/admin/drivers');
    return response.data;
  },

  async approveDriver(driverId: string) {
    const response = await api.put<{ driver: AdminDriver }>(`/admin/drivers/${driverId}/approve`);
    return response.data.driver;
  },

  async blockDriver(driverId: string) {
    const response = await api.put<{ driver: AdminDriver }>(`/admin/drivers/${driverId}/block`);
    return response.data.driver;
  },

  async enableDriver(driverId: string) {
    const response = await api.put<{ driver: AdminDriver }>(`/admin/drivers/${driverId}/enable`);
    return response.data.driver;
  },

  async getVehicles() {
    const response = await api.get<AdminVehicle[]>('/admin/vehicles');
    return response.data;
  },

  async createVehicle(payload: VehiclePayload) {
    const response = await api.post('/admin/vehicles', payload);
    return response.data.vehicle as AdminVehicle;
  },

  async updateVehicle(vehicleId: string, payload: Partial<VehiclePayload>) {
    const response = await api.put(`/admin/vehicles/${vehicleId}`, payload);
    return response.data.vehicle as AdminVehicle;
  },

  async getRides() {
    const response = await api.get<AdminRide[]>('/admin/rides');
    return response.data;
  },

  async deleteRide(rideId: string) {
    await api.delete(`/admin/rides/${rideId}`);
  }
};

export default adminService;
