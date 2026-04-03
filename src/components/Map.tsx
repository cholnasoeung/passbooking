import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LatLng {
  lat: number;
  lng: number;
}

interface DriverMarker {
  id: string;
  location: LatLng;
  vehicleType: 'tuktuk' | 'moto' | 'car' | 'taxi';
}

interface MapProps {
  pickup: LatLng | null;
  destination?: LatLng | null;
  routeCoords?: [number, number][];
  driverLocation?: LatLng | null;
  driverMarkers?: DriverMarker[];
}

const makeIcon = (color: string, size = 16) =>
  L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const DRIVER_ICON = L.divIcon({
  html: `<div style="
    width:20px;height:20px;
    background:#3B82F6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:10px;
  ">ðŸ›º</div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const VEHICLE_COLORS: Record<DriverMarker['vehicleType'], string> = {
  tuktuk: '#22C55E',
  moto: '#F97316',
  car: '#6366F1',
  taxi: '#EF4444'
};

const MapController = ({
  pickup,
  destination,
}: {
  pickup: LatLng | null;
  destination: LatLng | null | undefined;
}) => {
  const map = useMap();

  useEffect(() => {
    if (pickup && destination) {
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng],
        ],
        { padding: [60, 60] }
      );
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    }
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  return null;
};

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282]; // Phnom Penh

const Map: React.FC<MapProps> = ({ pickup, destination, routeCoords, driverLocation, driverMarkers }) => {
  const center: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController pickup={pickup} destination={destination} />

      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={makeIcon('#00B14F', 16)} />
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={makeIcon('#FF3B30', 16)} />
      )}

      {driverMarkers?.map((driver) => (
        <Marker
          key={driver.id}
          position={[driver.location.lat, driver.location.lng]}
          icon={makeIcon(VEHICLE_COLORS[driver.vehicleType], 16)}
        />
      ))}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={DRIVER_ICON} />
      )}

      {routeCoords && routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="#00B14F" weight={5} opacity={0.85} />
      )}
    </MapContainer>
  );
};

export default Map;
