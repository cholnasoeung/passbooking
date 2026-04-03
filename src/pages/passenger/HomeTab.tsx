import React, { useEffect, useRef, useState } from 'react';
import BottomSheet from '../../components/BottomSheet';
import Map from '../../components/Map';
import RideStatus from '../../components/RideStatus';
import VehicleSelector from '../../components/VehicleSelector';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ridesService from '../../services/rides';
import vehiclesService from '../../services/vehicles';
import type { PassengerRide } from '../../services/rides';
import type { VehicleOption } from '../../services/vehicles';

type LatLng = { lat: number; lng: number };
type Suggestion = { id: string; label: string; location: LatLng };
type DriverMarker = { id: string; location: LatLng; vehicleType: VehicleOption['type'] };
type RouteInfo = {
  distanceKm: number;
  durationMinutes: number;
  durationLabel: string;
  path: [number, number][];
};

const DEFAULT_LOCATION: LatLng = { lat: 11.5564, lng: 104.9282 };

const formatDistance = (d: number | null) => (d == null ? '—' : `${d.toFixed(1)} km`);

const formatDuration = (minutes: number | null) => {
  if (minutes == null) return '—';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }
  return `${Math.round(minutes)} min`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const fetchRouteDetails = async (pickup: LatLng, destination: LatLng): Promise<RouteInfo> => {
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
  );
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error('Unable to calculate route');
  const route = data.routes[0];
  const durationMinutes = route.duration / 60;
  return {
    distanceKm: route.distance / 1000,
    durationMinutes,
    durationLabel: formatDuration(durationMinutes),
    path: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
  };
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const HomeTab = () => {
  const { user } = useAuth();

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

  // Geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setCurrentLocation(loc);
        setPickupLocation(loc);
        setMapFocus(loc);
      },
      () => {
        setCurrentLocation(DEFAULT_LOCATION);
        setPickupLocation(DEFAULT_LOCATION);
        setMapFocus(DEFAULT_LOCATION);
      }
    );
  }, []);

  // Load vehicles
  useEffect(() => {
    void vehiclesService.getVehicles()
      .then((items) => {
        setVehicles(items);
        if (items.length > 0) setSelectedVehicleType((c) => c ?? items[0].type);
      })
      .catch(() => setFeedback({ type: 'error', message: 'Unable to load vehicle options' }));
  }, []);

  // Route calculation
  useEffect(() => {
    if (!pickupLocation || !destinationLocation) {
      setRouteInfo(null);
      setPreviewRoutePath(null);
      return;
    }
    const run = async () => {
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
    void run();
  }, [pickupLocation, destinationLocation]);

  // Nearby drivers polling
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const params: Record<string, string | number> = { lat: pickupLocation.lat, lng: pickupLocation.lng };
        if (selectedVehicleType) params.vehicleType = selectedVehicleType;
        const res = await api.get('/rides/nearby', { params });
        setDriverMarkers(
          res.data.map((d: any) => ({
            id: d._id,
            location: { lat: d.currentLocation?.lat ?? DEFAULT_LOCATION.lat, lng: d.currentLocation?.lng ?? DEFAULT_LOCATION.lng },
            vehicleType: d.vehicleId?.type || 'tuktuk',
          }))
        );
      } catch {
        setDriverMarkers([]);
      }
    };
    void fetchDrivers();
    const id = setInterval(() => void fetchDrivers(), 12000);
    return () => clearInterval(id);
  }, [pickupLocation, selectedVehicleType]);

  // Ride status polling
  useEffect(() => {
    if (!ride) {
      if (ridePollingRef.current) clearInterval(ridePollingRef.current);
      return;
    }
    ridePollingRef.current = setInterval(async () => {
      try {
        setRide(await ridesService.getRide(ride._id));
      } catch { /* keep current */ }
    }, 4000);
    return () => { if (ridePollingRef.current) clearInterval(ridePollingRef.current); };
  }, [ride?._id]);

  // Driver motion simulation
  useEffect(() => {
    if (!ride || ride.status === 'completed' || ride.status === 'cancelled') {
      if (driverMotionRef.current) clearInterval(driverMotionRef.current);
      return;
    }
    const target = ride.status === 'ongoing' ? ride.destination : pickupLocation;
    const start = ride.driverId?.currentLocation ?? pickupLocation;
    setSimulatedDriverLocation(start);
    driverMotionRef.current = setInterval(() => {
      setSimulatedDriverLocation((prev) => {
        if (!prev) return start;
        const step = 0.0025;
        const nextLat = prev.lat + Math.sign(target.lat - prev.lat) * Math.min(Math.abs(target.lat - prev.lat), step);
        const nextLng = prev.lng + Math.sign(target.lng - prev.lng) * Math.min(Math.abs(target.lng - prev.lng), step);
        if (Math.abs(target.lat - prev.lat) < step && Math.abs(target.lng - prev.lng) < step) return target;
        return { lat: nextLat, lng: nextLng };
      });
    }, 2200);
    return () => { if (driverMotionRef.current) clearInterval(driverMotionRef.current); };
  }, [ride, pickupLocation]);

  // Ride route path
  useEffect(() => {
    if (!ride) { setRideRoutePath(null); return; }
    if (ride.routePath?.length) {
      setRideRoutePath(ride.routePath.map((p) => [p.lat, p.lng]));
      return;
    }
    void fetchRouteDetails(ride.pickup, ride.destination)
      .then((d) => setRideRoutePath(d.path))
      .catch(() => setRideRoutePath(null));
  }, [ride?._id, ride?.pickup, ride?.destination, ride?.routePath]);

  // Seat cap
  useEffect(() => {
    const v = vehicles.find((v) => v.type === selectedVehicleType);
    if (v && seats > v.maxSeats) setSeats(v.maxSeats);
  }, [vehicles, selectedVehicleType, seats]);

  // Form open/close based on ride status
  useEffect(() => {
    if (ride && !['completed', 'cancelled'].includes(ride.status)) setFormOpen(false);
    else setFormOpen(true);
  }, [ride]);

  // Search helpers
  const searchPlaces = async (query: string, setter: React.Dispatch<React.SetStateAction<Suggestion[]>>) => {
    if (!query.trim()) { setter([]); return; }
    setLocationsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`);
      const results = await res.json();
      setter(results.map((item: { place_id: number; display_name: string; lat: string; lon: string }) => ({
        id: String(item.place_id),
        label: item.display_name,
        location: { lat: Number(item.lat), lng: Number(item.lon) },
      })));
    } catch {
      setter([]);
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
    ref.current = setTimeout(() => void searchPlaces(value, setter), 300);
  };

  const selectSuggestion = (s: Suggestion, type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setPickupLocation(s.location);
      setPickupInput(s.label);
      setPickupSuggestions([]);
      setMapFocus(s.location);
    } else {
      setDestinationLocation(s.location);
      setDestinationInput(s.label);
      setDestinationSuggestions([]);
    }
  };

  const handleSwapLocations = () => {
    if (!destinationLocation) return;
    const np = destinationLocation, nd = pickupLocation;
    const npText = destinationInput || 'Selected location';
    const ndText = pickupInput === 'Current location' ? '' : pickupInput;
    setPickupLocation(np); setDestinationLocation(nd);
    setPickupInput(npText); setDestinationInput(ndText);
    setMapFocus(np);
  };

  const handleBookRide = async () => {
    if (!destinationLocation || !routeInfo || !selectedVehicleType) {
      setFeedback({ type: 'error', message: 'Choose a destination before booking' });
      return;
    }
    setBooking(true);
    setFeedback(null);
    try {
      const created = await ridesService.createRide({
        pickup: pickupLocation,
        destination: destinationLocation,
        distance: routeInfo.distanceKm,
        duration: routeInfo.durationLabel,
        vehicleType: selectedVehicleType,
        seats,
        routePath: routeInfo.path.map(([lat, lng]) => ({ lat, lng })),
      });
      setRide(created);
      setFeedback({ type: 'success', message: 'Finding your driver...' });
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err, 'Unable to book the ride') });
    } finally {
      setBooking(false);
    }
  };

  const handleCancelRide = async () => {
    if (!ride) return;
    setCancelling(true);
    try {
      setRide(await ridesService.cancelRide(ride._id));
      setFeedback({ type: 'success', message: 'Ride cancelled' });
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err, 'Unable to cancel the ride') });
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

  const selectedVehicle = vehicles.find((v) => v.type === selectedVehicleType) ?? null;
  const estimatedPrice = selectedVehicle && routeInfo
    ? `$${(selectedVehicle.basePrice + routeInfo.distanceKm * selectedVehicle.pricePerKm * seats).toFixed(2)}`
    : '—';
  const activeRouteCoords = rideRoutePath ?? previewRoutePath ?? routeInfo?.path ?? null;

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Map fills entire screen */}
      <div className="absolute inset-0">
        <Map
          pickup={pickupLocation}
          destination={destinationLocation}
          routeCoords={activeRouteCoords}
          driverLocation={simulatedDriverLocation}
          driverMarkers={driverMarkers}
          focusLocation={mapFocus}
        />
      </div>

      {/* Floating header */}
      <div className="absolute top-4 inset-x-4 z-[1200]">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-white/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-slate-500">{getGreeting()},</p>
            <p className="text-sm font-bold text-slate-900 truncate">{user?.name ?? 'Guest'}</p>
          </div>
          {(routeLoading || locationsLoading) && (
            <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>
      </div>

      {/* My Location button */}
      <div className="absolute right-4 top-[76px] z-[1200]">
        <button
          type="button"
          onClick={() => {
            const t = currentLocation ?? DEFAULT_LOCATION;
            setPickupLocation(t);
            setMapFocus(t);
            setPickupInput('Current location');
          }}
          className="bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-emerald-500">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          My Location
        </button>
      </div>

      {/* Bottom Sheet — positioned above the tab bar (68px) */}
      <BottomSheet bottomOffset={68}>
        <div className="max-h-[58vh] overflow-y-auto pb-2 space-y-4 scrollbar-hide">

          {/* Drag handle */}
          <div className="flex justify-center pt-1 pb-2">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>

          {formOpen ? (
            <>
              {/* Location input card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-visible shadow-sm">
                {/* Pickup */}
                <div className="relative flex items-center gap-3 px-4 py-3.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0 ring-4 ring-emerald-100" />
                  <input
                    value={pickupInput}
                    onChange={(e) => { setPickupInput(e.target.value); scheduleSearch(e.target.value, setPickupSuggestions, pickupSearchRef); }}
                    placeholder="Pick up from"
                    className="flex-1 text-sm text-slate-800 font-medium outline-none bg-transparent placeholder-slate-400 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleSwapLocations}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shadow-sm flex-shrink-0"
                    title="Swap locations"
                  >
                    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
                      <path d="M5 3a1 1 0 000 2c5.523 0 10 4.477 10 10a1 1 0 102 0C17 8.373 11.627 3 5 3z" />
                      <path d="M4 9a1 1 0 011-1h.01a1 1 0 010 2H5a1 1 0 01-1-1zM3 15a1 1 0 011-1h.01a1 1 0 010 2H4a1 1 0 01-1-1z" />
                    </svg>
                  </button>
                  {pickupSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-[1300] mt-1 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                      {pickupSuggestions.map((s) => (
                        <button key={s.id} type="button" onClick={() => selectSuggestion(s, 'pickup')}
                          className="block w-full border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors last:border-b-0">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mx-4 h-px bg-slate-200" />

                {/* Destination */}
                <div className="relative flex items-center gap-3 px-4 py-3.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0 ring-4 ring-rose-100" />
                  <input
                    value={destinationInput}
                    onChange={(e) => { setDestinationInput(e.target.value); scheduleSearch(e.target.value, setDestinationSuggestions, destinationSearchRef); }}
                    placeholder="Where to?"
                    className="flex-1 text-sm text-slate-800 font-medium outline-none bg-transparent placeholder-slate-400 min-w-0"
                  />
                  {destinationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-[1300] mt-1 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                      {destinationSuggestions.map((s) => (
                        <button key={s.id} type="button" onClick={() => selectSuggestion(s, 'destination')}
                          className="block w-full border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors last:border-b-0">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Route info pills */}
              {routeInfo && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Time', value: routeInfo.durationLabel, icon: '⏱' },
                    { label: 'Distance', value: formatDistance(routeInfo.distanceKm), icon: '📍' },
                    { label: 'Fare', value: estimatedPrice, icon: '💰', highlight: true },
                  ].map(({ label, value, icon, highlight }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 px-2 py-2.5 text-center shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{icon} {label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Vehicle selector */}
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

              {/* Active ride status (when ride exists and form is open) */}
              {ride && (
                <RideStatus
                  status={ride.status}
                  driverName={ride.driverId?.userId?.name ?? null}
                  vehicleType={ride.vehicleType}
                />
              )}

              {/* Active ride details card */}
              {ride && !['completed', 'cancelled'].includes(ride.status) && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {ride.driverId?.userId?.name ?? 'Finding driver...'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{ride.vehicleType} · {ride.seats} seat{ride.seats > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-base font-bold text-emerald-700">${ride.price.toFixed(2)}</p>
                </div>
              )}

              {/* Book / Cancel / Reset button */}
              <div className="space-y-2">
                {ride ? (
                  <button
                    type="button"
                    onClick={ride.status === 'completed' || ride.status === 'cancelled' ? handleResetRide : handleCancelRide}
                    disabled={cancelling}
                    className={`w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                      ride.status === 'completed' || ride.status === 'cancelled'
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {ride.status === 'completed' || ride.status === 'cancelled'
                      ? 'Book Another Ride'
                      : cancelling ? 'Cancelling...' : 'Cancel Ride'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBookRide}
                    disabled={!routeInfo || !selectedVehicleType || booking}
                    className="w-full py-4 rounded-2xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: !routeInfo || !selectedVehicleType || booking ? '#9CA3AF' : 'linear-gradient(135deg, #10B981, #00B14F)' }}
                  >
                    {booking ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finding driver...
                      </>
                    ) : (
                      <>
                        Book Ride
                        <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Feedback banner */}
              {feedback && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}>
                  {feedback.message}
                </div>
              )}
            </>
          ) : (
            /* Compact ride-in-progress view */
            ride && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ride in progress</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {ride.vehicleType} <span className="text-emerald-600">${ride.price.toFixed(2)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormOpen(true)}
                    className="text-xs font-bold text-slate-500 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    Details
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
                  className="w-full py-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default HomeTab;
