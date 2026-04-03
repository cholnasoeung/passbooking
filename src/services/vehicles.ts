import api from './api';

export interface VehicleOption {
  _id: string;
  type: 'tuktuk' | 'moto' | 'car' | 'taxi';
  basePrice: number;
  pricePerKm: number;
  maxSeats: number;
  enabled: boolean;
}

const vehiclesService = {
  async getVehicles() {
    const response = await api.get<VehicleOption[]>('/vehicles');
    return response.data;
  }
};

export default vehiclesService;
