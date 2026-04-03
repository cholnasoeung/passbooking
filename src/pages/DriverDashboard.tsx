import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface LatLng {
  lat: number;
  lng: number;
}

interface RideUser {
  name: string;
  email: string;
}

interface Ride {
  _id: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed';
  pickup: LatLng;
  destination: LatLng;
  distance: number;
  duration: string;
  price: number;
  userId?: RideUser;
}

interface DriverStatusResponse {
  isOnline: boolean;
  isApproved?: boolean;
  isBlocked?: boolean;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  return (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message || fallback;
};

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [driverNotice, setDriverNotice] = useState('');
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const driverAccessLocked = isBlocked || !isApproved;

  const applyDriverNotice = (message: string) => {
    if (!message) return;

    setDriverNotice(message);

    const normalized = message.toLowerCase();
    if (normalized.includes('blocked')) {
      setIsBlocked(true);
      setIsOnline(false);
    }
    if (normalized.includes('approval')) {
      setIsApproved(false);
      setIsOnline(false);
    }
  };

  useEffect(() => {
    api.get<DriverStatusResponse>('/driver/status')
      .then((res) => {
        setIsOnline(res.data.isOnline);
        setIsApproved(res.data.isApproved !== false);
        setIsBlocked(res.data.isBlocked === true);

        if (res.data.isBlocked) {
          setDriverNotice('Your driver account has been blocked by admin.');
        } else if (res.data.isApproved === false) {
          setDriverNotice('Your driver account is waiting for admin approval.');
        } else {
          setDriverNotice('');
        }
      })
      .catch((error) => {
        applyDriverNotice(getErrorMessage(error, 'Unable to load driver status'));
      });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMyLocation({ lat: 11.5564, lng: 104.9282 })
    );
  }, []);

  useEffect(() => {
    if (!isOnline || driverAccessLocked) {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setRides([]);
      return;
    }

    const sendLocation = () => {
      if (!myLocation) return;

      api.put('/driver/location', myLocation).catch((error) => {
        applyDriverNotice(getErrorMessage(error, 'Unable to share driver location'));
      });
    };

    const fetchRides = async () => {
      try {
        const res = await api.get<Ride[]>('/rides/pending');
        setRides(res.data);

        const currentActiveRide = res.data.find(
          (ride) => ride.status === 'accepted' || ride.status === 'ongoing'
        );

        setActiveRide(currentActiveRide || null);
      } catch (error) {
        applyDriverNotice(getErrorMessage(error, 'Unable to load ride requests'));
      }
    };

    sendLocation();
    void fetchRides();

    locationIntervalRef.current = setInterval(sendLocation, 5000);
    pollIntervalRef.current = setInterval(() => {
      void fetchRides();
    }, 4000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [driverAccessLocked, isOnline, myLocation]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleToggleOnline = async () => {
    setToggling(true);

    try {
      const res = await api.put<{ isOnline: boolean }>('/driver/online');
      setIsOnline(res.data.isOnline);
      setDriverNotice('');

      if (!res.data.isOnline) {
        setRides([]);
        setActiveRide(null);
      }
    } catch (error) {
      applyDriverNotice(getErrorMessage(error, 'Unable to update driver status'));
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    setAccepting(rideId);

    try {
      const res = await api.put<Ride>(`/rides/${rideId}/accept`);
      setActiveRide(res.data);
      setRides((prev) => prev.filter((ride) => ride._id !== rideId));
      setDriverNotice('');
    } catch (error) {
      applyDriverNotice(getErrorMessage(error, 'Unable to accept ride'));
    } finally {
      setAccepting(null);
    }
  };

  const handleUpdateStatus = async (rideId: string, status: string) => {
    try {
      const res = await api.put<Ride>(`/rides/${rideId}/status`, { status });
      setDriverNotice('');

      if (status === 'completed') {
        setActiveRide(null);
      } else {
        setActiveRide(res.data);
      }
    } catch (error) {
      applyDriverNotice(getErrorMessage(error, 'Unable to update ride status'));
    }
  };

  const pendingRides = rides.filter((ride) => ride.status === 'pending');
  const statusText = isBlocked
    ? 'Blocked'
    : !isApproved
      ? 'Pending Approval'
      : isOnline
        ? 'Online'
        : 'Offline';
  const statusColor = isBlocked
    ? 'text-red-500'
    : !isApproved
      ? 'text-amber-500'
      : isOnline
        ? 'text-grab-green'
        : 'text-gray-400';

  return (
    <div className="relative h-screen w-full">
      <div className="absolute inset-0">
        <Map pickup={myLocation} destination={activeRide?.pickup ?? null} />
      </div>

      <div className="absolute left-0 right-0 top-0 z-[1000] p-4">
        <div className="mx-auto max-w-md">
          <div className="card-grab flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
                  isOnline && !driverAccessLocked ? 'bg-grab-green' : 'bg-gray-300'
                }`}
              >
                DR
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className={`text-xs font-medium ${statusColor}`}>{statusText}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleOnline}
                disabled={toggling || driverAccessLocked}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  isOnline
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : driverAccessLocked
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'bg-grab-green text-white hover:bg-grab-dark'
                }`}
              >
                {toggling ? '...' : isOnline ? 'Go Offline' : 'Go Online'}
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[60vh] overflow-y-auto p-4">
        <div className="mx-auto max-w-md space-y-3">
          {driverNotice && (
            <div
              className={`card-grab border ${
                isBlocked
                  ? 'border-red-200 bg-red-50'
                  : !isApproved
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  isBlocked
                    ? 'text-red-700'
                    : !isApproved
                      ? 'text-amber-700'
                      : 'text-blue-700'
                }`}
              >
                {driverNotice}
              </p>
            </div>
          )}

          {activeRide && (
            <div className="card-grab border-2 border-grab-green">
              <div className="mb-3 flex items-center gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Active Ride</p>
                  <p className="text-xs font-medium capitalize text-grab-green">{activeRide.status}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-bold text-grab-green">${activeRide.price.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{activeRide.distance.toFixed(1)} km</p>
                </div>
              </div>

              <div className="mb-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-grab-green" />
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-sm text-gray-700">
                      {activeRide.pickup.lat.toFixed(4)}, {activeRide.pickup.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs text-gray-500">Destination</p>
                    <p className="text-sm text-gray-700">
                      {activeRide.destination.lat.toFixed(4)}, {activeRide.destination.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {activeRide.userId && (
                <div className="mb-3 rounded-xl bg-grab-light p-3">
                  <p className="text-xs text-gray-500">Passenger</p>
                  <p className="text-sm font-medium text-gray-800">{activeRide.userId.name}</p>
                </div>
              )}

              <div className="flex gap-2">
                {activeRide.status === 'accepted' && (
                  <button
                    onClick={() => handleUpdateStatus(activeRide._id, 'ongoing')}
                    className="btn-grab flex-1 py-2 text-sm"
                  >
                    Start Ride
                  </button>
                )}
                {activeRide.status === 'ongoing' && (
                  <button
                    onClick={() => handleUpdateStatus(activeRide._id, 'completed')}
                    className="btn-grab flex-1 py-2 text-sm"
                  >
                    Complete Ride
                  </button>
                )}
              </div>
            </div>
          )}

          {!activeRide && isOnline && !driverAccessLocked && (
            <>
              {pendingRides.length === 0 ? (
                <div className="card-grab py-4 text-center">
                  <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-grab-green border-t-transparent" />
                  <p className="text-sm font-medium text-gray-600">Waiting for ride requests...</p>
                </div>
              ) : (
                <>
                  <div className="card-grab py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {pendingRides.length} Ride Request{pendingRides.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {pendingRides.map((ride) => (
                    <div key={ride._id} className="card-grab">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {ride.userId?.name || 'Passenger'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ride.distance.toFixed(1)} km • {ride.duration}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-grab-green">${ride.price.toFixed(2)}</p>
                      </div>

                      <div className="mb-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="h-2 w-2 rounded-full bg-grab-green" />
                          {ride.pickup.lat.toFixed(4)}, {ride.pickup.lng.toFixed(4)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          {ride.destination.lat.toFixed(4)}, {ride.destination.lng.toFixed(4)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptRide(ride._id)}
                        disabled={accepting === ride._id}
                        className="btn-grab w-full py-2 text-sm"
                      >
                        {accepting === ride._id ? 'Accepting...' : 'Accept Ride'}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {!isOnline && !activeRide && (
            <div className="card-grab py-5 text-center">
              <p className="font-semibold text-gray-700">
                {driverAccessLocked ? 'Driver access limited' : 'You are offline'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {driverAccessLocked
                  ? 'Approval or admin action is required before you can receive rides.'
                  : 'Go online to receive ride requests.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
