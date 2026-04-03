import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from '../components/BottomSheet';
import Map from '../components/Map';
import RideStatus from '../components/RideStatus';
import VehicleSelector from '../components/VehicleSelector';
import HomePromoPanel from '../components/HomePromoPanel';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ridesService from '../services/rides';
import vehiclesService from '../services/vehicles';
import type { PassengerRide } from '../services/rides';
import type { VehicleOption } from '../services/vehicles';

type LatLng = {
  lat: number;
  lng: number;
};

type Suggestion = {
  id: string;
  label: string;
  location: LatLng;
};

type DriverMarker = {
  id: string;
  location: LatLng;
  vehicleType: VehicleOption['type'];
};

type RouteInfo = {
  distanceKm: number;
  durationMinutes: number;
  durationLabel: string;
  path: [number, number][];
};

const DEFAULT_LOCATION: LatLng = { lat: 11.5564, lng: 104.9282 };

const formatDistance = (distance: number | null) =>
  distance == null ? '--' : `${distance.toFixed(1)} km`;

const formatDuration = (minutes: number | null) => {
  if (minutes == null) return '--';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }
  return `${Math.round(minutes)} min`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const fetchRouteDetails = async (pickup: LatLng, destination: LatLng) => {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
  );
  const data = await response.json();

  if (data.code !== 'Ok') {
    throw new Error('Unable to calculate route');
  }

  const route = data.routes[0];
  const durationMinutes = route.duration / 60;

  return {
    distanceKm: route.distance / 1000,
    durationMinutes,
    durationLabel: formatDuration(durationMinutes),
    path: route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    )
  };
};

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleOption['type'] | null>(null);
  const [seats, setSeats] = useState(1);

  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [mapFocus, setMapFocus] = useState<LatLng>(DEFAULT_LOCATION);
  const [pickupLocation, setPickupLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(null);
  const [pickupInput, setPickupInput] = useState('Current location');
  const [destinationInput, setDestinationInput] = useState('');

  const [pickupSuggestions, setPickupSuggestions] = useState<Suggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Suggestion[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [previewRoutePath, setPreviewRoutePath] = useState<[number, number][] | null>(null);
  const [rideRoutePath, setRideRoutePath] = useState<[number, number][] | null>(null);

  const [ride, setRide] = useState<PassengerRide | null>(null);
  const [rideHistory, setRideHistory] = useState<PassengerRide[]>([]);
  const [driverMarkers, setDriverMarkers] = useState<DriverMarker[]>([]);
  const [simulatedDriverLocation, setSimulatedDriverLocation] = useState<LatLng | null>(null);

  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(true);

  const pickupSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ridePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverMotionRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(location);
        setPickupLocation(location);
        setMapFocus(location);
      },
      () => {
        setCurrentLocation(DEFAULT_LOCATION);
        setPickupLocation(DEFAULT_LOCATION);
        setMapFocus(DEFAULT_LOCATION);
      }
    );
  }, []);

  useEffect(() => {
    void vehiclesService.getVehicles()
      .then((items) => {
        setVehicles(items);
        if (items.length > 0) {
          setSelectedVehicleType((current) => current ?? items[0].type);
        }
      })
      .catch(() => {
        setFeedback({ type: 'error', message: 'Unable to load vehicle options' });
      });
  }, []);

  useEffect(() => {
    void ridesService.getHistory()
      .then((history) => setRideHistory(history))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickupLocation || !destinationLocation) {
      setRouteInfo(null);
      setPreviewRoutePath(null);
      return;
    }

    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        const details = await fetchRouteDetails(pickupLocation, destinationLocation);
        setRouteInfo(details);
        setPreviewRoutePath(details.path);
      } catch {
        setRouteInfo(null);
        setPreviewRoutePath(null);
        setFeedback({ type: 'error', message: 'Unable to calculate the route right now' });
      } finally {
        setRouteLoading(false);
      }
    };

    void fetchRoute();
  }, [pickupLocation, destinationLocation]);

  useEffect(() => {
    const fetchNearbyDrivers = async () => {
      try {
        const params: Record<string, string | number> = {
          lat: pickupLocation.lat,
          lng: pickupLocation.lng
        };

        if (selectedVehicleType) {
          params.vehicleType = selectedVehicleType;
        }

        const response = await api.get('/rides/nearby', { params });
        setDriverMarkers(
          response.data.map((driver: any) => ({
            id: driver._id,
            location: {
              lat: driver.currentLocation?.lat ?? DEFAULT_LOCATION.lat,
              lng: driver.currentLocation?.lng ?? DEFAULT_LOCATION.lng
            },
            vehicleType: driver.vehicleId?.type || 'tuktuk'
          }))
        );
      } catch {
        setDriverMarkers([]);
      }
    };

    void fetchNearbyDrivers();
    const interval = setInterval(() => {
      void fetchNearbyDrivers();
    }, 12000);

    return () => clearInterval(interval);
  }, [pickupLocation, selectedVehicleType]);

  useEffect(() => {
    if (!ride) {
      if (ridePollingRef.current) clearInterval(ridePollingRef.current);
      return;
    }

    const pollRide = async () => {
      try {
        const latestRide = await ridesService.getRide(ride._id);
        setRide(latestRide);
      } catch {
        // keep the current ride state if polling fails
      }
    };

    ridePollingRef.current = setInterval(() => {
      void pollRide();
    }, 4000);

    return () => {
      if (ridePollingRef.current) clearInterval(ridePollingRef.current);
    };
  }, [ride?._id]);

  useEffect(() => {
    if (!ride || ride.status === 'completed' || ride.status === 'cancelled') {
      if (driverMotionRef.current) clearInterval(driverMotionRef.current);
      return;
    }

    const target = ride.status === 'ongoing' ? ride.destination : pickupLocation;
    const start = ride.driverId?.currentLocation ?? pickupLocation;

    setSimulatedDriverLocation(start);

    driverMotionRef.current = setInterval(() => {
      setSimulatedDriverLocation((previous) => {
        if (!previous) return start;

        const step = 0.0025;
        const nextLat = previous.lat + Math.sign(target.lat - previous.lat) * Math.min(Math.abs(target.lat - previous.lat), step);
        const nextLng = previous.lng + Math.sign(target.lng - previous.lng) * Math.min(Math.abs(target.lng - previous.lng), step);

        if (Math.abs(target.lat - previous.lat) < step && Math.abs(target.lng - previous.lng) < step) {
          return target;
        }

        return { lat: nextLat, lng: nextLng };
      });
    }, 2200);

    return () => {
      if (driverMotionRef.current) clearInterval(driverMotionRef.current);
    };
  }, [ride, pickupLocation]);

  useEffect(() => {
    if (!ride) {
      setRideRoutePath(null);
      return;
    }

    const fetchRideRoute = async () => {
      try {
        const details = await fetchRouteDetails(ride.pickup, ride.destination);
        setRideRoutePath(details.path);
      } catch {
        setRideRoutePath(null);
      }
    };

    void fetchRideRoute();
  }, [ride?._id]);

  useEffect(() => {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.type === selectedVehicleType);
    if (selectedVehicle && seats > selectedVehicle.maxSeats) {
      setSeats(selectedVehicle.maxSeats);
    }
  }, [vehicles, selectedVehicleType, seats]);

  const searchPlaces = async (query: string, setter: React.Dispatch<React.SetStateAction<Suggestion[]>>) => {
    if (!query.trim()) {
      setter([]);
      return;
    }

    setLocationsLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`
      );
      const results = await response.json();
      setter(
        results.map((item: { place_id: number; display_name: string; lat: string; lon: string }) => ({
          id: String(item.place_id),
          label: item.display_name,
          location: {
            lat: Number(item.lat),
            lng: Number(item.lon)
          }
        }))
      );
    } catch {
      setter([]);
      setFeedback({ type: 'error', message: 'Unable to load location suggestions' });
    } finally {
      setLocationsLoading(false);
    }
  };

  const scheduleSearch = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<Suggestion[]>>,
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      void searchPlaces(value, setter);
    }, 300);
  };

  const selectSuggestion = (suggestion: Suggestion, type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setPickupLocation(suggestion.location);
      setPickupInput(suggestion.label);
      setPickupSuggestions([]);
      setMapFocus(suggestion.location);
      return;
    }

    setDestinationLocation(suggestion.location);
    setDestinationInput(suggestion.label);
    setDestinationSuggestions([]);
  };

  const handleSwapLocations = () => {
    if (!destinationLocation) return;

    const nextPickup = destinationLocation;
    const nextDestination = pickupLocation;
    const nextPickupText = destinationInput || 'Selected location';
    const nextDestinationText = pickupInput === 'Current location' ? '' : pickupInput;

    setPickupLocation(nextPickup);
    setDestinationLocation(nextDestination);
    setPickupInput(nextPickupText);
    setDestinationInput(nextDestinationText);
    setMapFocus(nextPickup);
  };

  const handleBookRide = async () => {
    if (!destinationLocation || !routeInfo || !selectedVehicleType) {
      setFeedback({ type: 'error', message: 'Choose a destination before booking' });
      return;
    }

    setBooking(true);
    setFeedback(null);

    try {
      const createdRide = await ridesService.createRide({
        pickup: pickupLocation,
        destination: destinationLocation,
        distance: routeInfo.distanceKm,
        duration: routeInfo.durationLabel,
        vehicleType: selectedVehicleType,
        seats
      });

      setRide(createdRide);
      setFeedback({ type: 'success', message: 'Finding driver...' });

      const history = await ridesService.getHistory();
      setRideHistory(history);
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Unable to book the ride') });
    } finally {
      setBooking(false);
    }
  };

  const handleCancelRide = async () => {
    if (!ride) return;

    setCancelling(true);

    try {
      const cancelledRide = await ridesService.cancelRide(ride._id);
      setRide(cancelledRide);
      setFeedback({ type: 'success', message: 'Ride cancelled successfully' });

      const history = await ridesService.getHistory();
      setRideHistory(history);
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Unable to cancel the ride') });
    } finally {
      setCancelling(false);
    }
  };

  const handleResetRide = () => {
    setRide(null);
    setDestinationLocation(null);
    setDestinationInput('');
    setRouteInfo(null);
    setSimulatedDriverLocation(null);
    setFeedback(null);
    setMapFocus(pickupLocation);
    setFormOpen(true);
  };

  useEffect(() => {
    if (ride && !['completed', 'cancelled'].includes(ride.status)) {
      setFormOpen(false);
    } else {
      setFormOpen(true);
    }
  }, [ride]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.type === selectedVehicleType) ?? null;
  const estimatedPrice = selectedVehicle && routeInfo
    ? `$${(selectedVehicle.basePrice + routeInfo.distanceKm * selectedVehicle.pricePerKm * seats).toFixed(2)}`
    : '--';
  const activeRouteCoords = rideRoutePath || previewRoutePath;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-100">
      <div className="absolute inset-0">
      <Map
        pickup={pickupLocation}
        destination={destinationLocation}
        routeCoords={activeRouteCoords ?? routeInfo?.path ?? null}
        driverLocation={simulatedDriverLocation}
        driverMarkers={driverMarkers}
        focusLocation={mapFocus}
      />
      </div>

      <div className="absolute inset-x-4 top-4 z-[1200] flex items-center justify-between rounded-3xl border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Passenger</p>
          <p className="text-base font-semibold text-slate-900">{user?.name || 'Guest'}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-sm font-semibold text-slate-500 transition hover:text-rose-500"
        >
          Logout
        </button>
      </div>

      <div className="absolute right-4 top-24 z-[1200]">
        <button
          type="button"
          onClick={() => {
            const target = currentLocation ?? DEFAULT_LOCATION;
            setPickupLocation(target);
            setMapFocus(target);
            setPickupInput('Current location');
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
        >
          My Location
        </button>
      </div>

      <BottomSheet className="z-[1200]">
        <div className="max-h-[72vh] space-y-4 overflow-y-auto pb-4">
          {formOpen ? (
            <>
              <HomePromoPanel />
              <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-300" />

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="relative space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Pickup
                  </label>
                  <input
                    value={pickupInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPickupInput(value);
                      scheduleSearch(value, setPickupSuggestions, pickupSearchRef);
                    }}
                    placeholder="Pick up from"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  {pickupSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-[1300] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {pickupSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => selectSuggestion(suggestion, 'pickup')}
                          className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 last:border-b-0"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="self-end rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Swap
                </button>
              </div>

              <div className="relative space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Destination
                </label>
                <input
                  value={destinationInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDestinationInput(value);
                    scheduleSearch(value, setDestinationSuggestions, destinationSearchRef);
                  }}
                  placeholder="Where to?"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                {destinationSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-[1300] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {destinationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(suggestion, 'destination')}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 last:border-b-0"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Distance</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDistance(routeInfo?.distanceKm ?? null)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Time</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {routeInfo ? routeInfo.durationLabel : '--'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Price</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{estimatedPrice}</p>
                </div>
              </div>

              {(routeLoading || locationsLoading) && (
                <p className="text-sm text-slate-500">
                  {routeLoading ? 'Calculating route...' : 'Searching locations...'}
                </p>
              )}

              <VehicleSelector
                vehicles={vehicles}
                selectedType={selectedVehicleType}
                onSelect={setSelectedVehicleType}
                distanceKm={routeInfo?.distanceKm ?? null}
                durationText={routeInfo?.durationLabel ?? null}
                seats={seats}
                onSeatsChange={setSeats}
                isLoading={booking || cancelling}
              />

              <div className="space-y-3">
                {ride ? (
                  <>
                    <RideStatus
                      status={ride.status}
                      driverName={ride.driverId?.userId?.name ?? null}
                      vehicleType={ride.vehicleType}
                    />
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                      <p className="font-semibold text-slate-900">
                        {ride.driverId?.userId?.name || 'Driver assigned soon'}
                      </p>
                      <p className="mt-1">Vehicle: {ride.vehicleType}</p>
                      <p>Seats: {ride.seats}</p>
                      <p>Fare: ${ride.price.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={ride.status === 'completed' || ride.status === 'cancelled' ? handleResetRide : handleCancelRide}
                      disabled={cancelling}
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        ride.status === 'completed' || ride.status === 'cancelled'
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      } ${cancelling ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      {ride.status === 'completed' || ride.status === 'cancelled'
                        ? 'Book Another Ride'
                        : (cancelling ? 'Cancelling...' : 'Cancel Ride')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleBookRide}
                    disabled={!routeInfo || !selectedVehicleType || booking}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {booking ? 'Finding driver...' : 'Book Ride'}
                  </button>
                )}
              </div>

              {feedback && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Ride history</p>
                {rideHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No rides yet.</p>
                ) : (
                  rideHistory.slice(0, 5).map((record) => (
                    <div key={record._id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 capitalize">
                            {record.vehicleType} | ${record.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(record.createdAt).toLocaleString()} | {record.status}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatDistance(record.distance)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            ride && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Ride In Progress
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {ride.vehicleType} • ${ride.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormOpen(true)}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                  >
                    Edit trip
                  </button>
                </div>

                <RideStatus
                  status={ride.status}
                  driverName={ride.driverId?.userId?.name ?? null}
                  vehicleType={ride.vehicleType}
                />

                <button
                  type="button"
                  onClick={handleCancelRide}
                  disabled={cancelling}
                  className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Ride'}
                </button>
              </div>
            )
          )}
        </div>
      </BottomSheet>
    </div>
  );
};

export default UserDashboard;
