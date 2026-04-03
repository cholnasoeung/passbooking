import React, { useState, useEffect, useRef, useMemo } from 'react';
import Map from '../components/Map';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import vehiclesService from '../services/vehicles';
import type { VehicleOption } from '../services/vehicles';
import { useNavigate } from 'react-router-dom';

interface LatLng { lat: number; lng: number }

interface RouteInfo {
  distanceKm: number;
  distanceText: string;
  duration: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Ride {
  _id: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed';
  price: number;
  distance: number;
  duration: string;
  driverId?: { currentLocation: LatLng; userId?: { name: string } } | null;
}

interface DriverMarker {
  id: string;
  location: LatLng;
  vehicleType: VehicleOption['type'];
}

const calculatePriceForVehicle = (vehicle: VehicleOption, distance: number, seats: number) => {
  const roundedSeats = Math.max(1, Math.floor(seats));
  const price = vehicle.basePrice + distance * vehicle.pricePerKm * roundedSeats;
  return parseFloat(price.toFixed(2));
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Searching for driver...', color: 'text-yellow-600' },
  accepted:  { label: 'Driver accepted! On the way', color: 'text-blue-600' },
  ongoing:   { label: 'Ride in progress', color: 'text-grab-green' },
  completed: { label: 'Ride completed!', color: 'text-gray-600' },
};

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationName, setDestinationName] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [ride, setRide] = useState<Ride | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleOption['type'] | null>(null);
  const [seats, setSeats] = useState(1);
  const [seatError, setSeatError] = useState('');
  const [driverMarkers, setDriverMarkers] = useState<DriverMarker[]>([]);
  const [nearbyError, setNearbyError] = useState('');

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void vehiclesService.getVehicles()
      .then((items) => setVehicles(items))
      .catch(() => setError('Unable to load vehicle options'));
  }, []);

  useEffect(() => {
    if (!selectedVehicleType && vehicles.length > 0) {
      setSelectedVehicleType(vehicles[0].type);
    }
  }, [vehicles, selectedVehicleType]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.type === selectedVehicleType) ?? null,
    [vehicles, selectedVehicleType]
  );

  const estimatedPrice = useMemo(() => {
    if (!selectedVehicle || !routeInfo) return null;
    return calculatePriceForVehicle(selectedVehicle, routeInfo.distanceKm, seats);
  }, [selectedVehicle, routeInfo, seats]);

  useEffect(() => {
    const vehicle = vehicles.find((item) => item.type === selectedVehicleType);
    if (vehicle && seats > vehicle.maxSeats) {
      setSeats(vehicle.maxSeats);
    }
  }, [vehicles, selectedVehicleType, seats]);

  // Get browser GPS location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPickup({ lat: 11.5564, lng: 104.9282 }) // fallback Phnom Penh
    );
  }, []);

  useEffect(() => {
    if (!pickup) {
      setDriverMarkers([]);
      return;
    }

    const fetchNearby = async () => {
      try {
        const params: Record<string, string | number> = {
          lat: pickup.lat,
          lng: pickup.lng
        };
        if (selectedVehicleType) {
          params.vehicleType = selectedVehicleType;
        }
        const res = await api.get('/rides/nearby', { params });
        const markers = res.data.map((driver: any) => ({
          id: driver._id,
          location: {
            lat: driver.currentLocation?.lat ?? 0,
            lng: driver.currentLocation?.lng ?? 0
          },
          vehicleType: driver.vehicleId?.type || 'tuktuk'
        }));
        setDriverMarkers(markers);
        setNearbyError('');
      } catch {
        setNearbyError('Unable to load nearby drivers');
      }
    };

    void fetchNearby();
  }, [pickup, selectedVehicleType]);

  // Poll ride status while active
  useEffect(() => {
    if (!ride || ride.status === 'completed') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${ride._id}`);
        setRide(res.data);
      } catch { /* silent */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ride?._id, ride?.status]);

  // Nominatim search (OpenStreetMap geocoding — free, no key)
  const handleSearchInput = (value: string) => {
    setDestinationName(value);
    setDestination(null);
    setRouteInfo(null);
    setRouteCoords([]);

    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (value.length < 3) { setSuggestions([]); return; }

    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setSuggestions(await res.json());
      } catch { /* silent */ }
    }, 500);
  };

  // OSRM routing (free, no key)
  const fetchRoute = async (from: LatLng, to: LatLng) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.code !== 'Ok') return;

      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );
      const distanceKm = route.distance / 1000;
      const minutes = Math.round(route.duration / 60);

      setRouteCoords(coords);
      setRouteInfo({
        distanceKm,
        distanceText: `${distanceKm.toFixed(1)} km`,
        duration: minutes >= 60
          ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
          : `${minutes} min`,
      });
    } catch { /* silent */ }
  };

  const handleSelectSuggestion = (result: NominatimResult) => {
    const dest = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setDestination(dest);
    setDestinationName(result.display_name.split(',').slice(0, 2).join(','));
    setSuggestions([]);
    if (pickup) fetchRoute(pickup, dest);
  };

  const handleSeatChange = (next: number) => {
    if (!selectedVehicle) return;
    const clamped = Math.min(Math.max(next, 1), selectedVehicle.maxSeats);
    setSeats(clamped);
    if (clamped > selectedVehicle.maxSeats) {
      setSeatError(`Maximum ${selectedVehicle.maxSeats} seats per ${selectedVehicle.type}`);
    } else {
      setSeatError('');
    }
  };

  const handleBookRide = async () => {
    if (!pickup || !destination || !routeInfo) return;
    setBooking(true);
    setError('');
    try {
      if (!selectedVehicle) {
        setError('Please select a vehicle type');
        return;
      }
      if (seats > selectedVehicle.maxSeats) {
        setSeatError(`Maximum ${selectedVehicle.maxSeats} seats allowed`);
        return;
      }
      const res = await api.post('/rides', {
        pickup,
        destination,
        distance: routeInfo.distanceKm,
        duration: routeInfo.duration,
        seats,
        vehicleType: selectedVehicle.type
      });
      setRide(res.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message || 'Failed to book ride'
      );
    } finally {
      setBooking(false);
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setRide(null);
    setDestination(null);
    setDestinationName('');
    setRouteInfo(null);
    setRouteCoords([]);
  };

  return (
    <div className="relative w-full h-screen">
      {/* Full-screen map */}
      <div className="absolute inset-0">
      <Map
        pickup={pickup}
        destination={destination}
        routeCoords={routeCoords}
        driverLocation={ride?.driverId?.currentLocation ?? null}
        driverMarkers={driverMarkers}
      />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="max-w-md mx-auto space-y-2">
          {/* Header card */}
          <div className="card-grab flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛺</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">TukTuk</p>
                <p className="text-xs text-gray-500">Hello, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Search bar */}
          {!ride && (
            <div className="card-grab relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-grab-green flex-shrink-0" />
                <p className="text-xs text-gray-500">Your current location</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={destinationName}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="input-grab text-sm flex-1"
                  autoComplete="off"
                />
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-grab-light text-sm border-b last:border-0 border-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-800 truncate">
                        {s.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {s.display_name.split(',').slice(1, 3).join(',')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4">
        <div className="max-w-md mx-auto space-y-3">

          {/* Route + price + book button */}
          {routeInfo && !ride && (
            <div className="card-grab space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-bold text-gray-800">{routeInfo.distanceText}</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-bold text-gray-800">{routeInfo.duration}</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-bold text-grab-green">
                    {estimatedPrice !== null ? `$${estimatedPrice.toFixed(2)}` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Vehicle</p>
                    <p className="font-semibold text-sm text-slate-800">
                      {selectedVehicle ? selectedVehicle.type : 'Select vehicle'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSeatChange(seats - 1)}
                      disabled={seats <= 1}
                      className="h-10 w-10 rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="text-lg font-semibold text-gray-800">{seats}</span>
                    <button
                      onClick={() => handleSeatChange(seats + 1)}
                      disabled={!selectedVehicle || seats >= (selectedVehicle?.maxSeats ?? 1)}
                      className="h-10 w-10 rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Seats selected • {selectedVehicle ? `${selectedVehicle.maxSeats} available` : 'Choose a vehicle'}
                </p>
                {seatError && <p className="text-xs text-rose-600">{seatError}</p>}
              </div>

              <p className="text-sm text-gray-500">
                {selectedVehicle
                  ? `${selectedVehicle.type.charAt(0).toUpperCase() + selectedVehicle.type.slice(1)} • $${selectedVehicle.pricePerKm.toFixed(2)}/km + $${selectedVehicle.basePrice.toFixed(2)} base`
                  : 'Select a vehicle to preview pricing'}
              </p>

              {error && <p className="text-red-500 text-xs text-center">{error}</p>}

              <button onClick={handleBookRide} disabled={booking} className="btn-grab w-full">
                {booking ? 'Booking...' : '🛺 Book Ride'}
              </button>
            </div>
          )}

          {/* Active ride status */}
          {ride && (
            <div className="card-grab">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-grab-light rounded-full flex items-center justify-center">
                  <span className="text-xl">🛺</span>
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${STATUS_LABELS[ride.status]?.color}`}>
                    {STATUS_LABELS[ride.status]?.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ride.distance.toFixed(1)} km • {ride.duration} •{' '}
                    <span className="text-grab-green font-medium">${ride.price.toFixed(2)}</span>
                  </p>
                </div>
                {ride.status === 'pending' && (
                  <div className="w-5 h-5 border-2 border-grab-green border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {ride.driverId?.userId?.name && (
                <div className="bg-grab-light rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-500">Your Driver</p>
                  <p className="font-medium text-gray-800 text-sm">{ride.driverId.userId.name}</p>
                </div>
              )}

              {(ride.status === 'pending' || ride.status === 'accepted') && (
                <button
                  onClick={handleReset}
                  className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              {ride.status === 'completed' && (
                <button onClick={handleReset} className="btn-grab w-full">
                  Book Another Ride
                </button>
              )}
            </div>
          )}
          {!ride && vehicles.length > 0 && (
            <div className="card-grab mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehicle options</p>
                  <p className="text-sm text-slate-400">Pick a vehicle type for your ride</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Filtered to {selectedVehicleType ? selectedVehicleType : 'all'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {vehicles.map((vehicle) => {
                  const isActive = vehicle.type === selectedVehicleType;

                  return (
                    <button
                      key={vehicle._id}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleType(vehicle.type);
                        setSeatError('');
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Base ${vehicle.basePrice.toFixed(2)} + ${vehicle.pricePerKm.toFixed(2)}/km • {vehicle.maxSeats} seats
                      </p>
                    </button>
                  );
                })}
              </div>
              {nearbyError && (
                <p className="text-xs text-rose-600">{nearbyError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
