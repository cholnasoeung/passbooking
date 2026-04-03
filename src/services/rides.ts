import api from './api';
import type { VehicleOption } from './vehicles';

export type RideStatus = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';

export interface PassengerRide {
  _id: string;
  distance: number;
  duration: string;
  price: number;
  status: RideStatus;
  seats: number;
  vehicleType: VehicleOption['type'];
  driverId?: {
    _id: string;
    userId?: {
      name: string;
      email: string;
    } | null;
    vehicleId?: VehicleOption;
    currentLocation?: {
      lat: number;
      lng: number;
    };
  } | null;
  pickup: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateRidePayload {
  pickup: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  distance: number;
  duration: string;
  vehicleType: VehicleOption['type'];
  seats: number;
}

const ridesService = {
  async createRide(payload: CreateRidePayload) {
    const response = await api.post<PassengerRide>('/rides', payload);
    return response.data;
  },

  async getRide(rideId: string) {
    const response = await api.get<PassengerRide>(`/rides/${rideId}`);
    return response.data;
  },

  async cancelRide(rideId: string) {
    const response = await api.put<{ ride: PassengerRide }>(`/rides/${rideId}/cancel`);
    return response.data.ride;
  },

  async getHistory() {
    const response = await api.get<PassengerRide[]>('/rides/history');
    return response.data;
  }
};

export default ridesService;
