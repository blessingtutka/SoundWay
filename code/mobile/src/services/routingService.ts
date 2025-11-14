import axios from '@/services/axiosService';

export const calculateRoute = async (start: Coordinate, end: Location) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson&steps=true`;
  const res = await axios.get(url);
  if (!res.data?.routes?.[0]) return null;

  const route = res.data.routes[0];
  const coordinates = route.geometry.coordinates.map(([lon, lat]: number[]) => ({ latitude: lat, longitude: lon }));
  const steps = route.legs[0]?.steps.map((s: any) => ({
    instruction: s.maneuver.instruction,
    distance: s.distance,
    location: {
      latitude: s.maneuver.location[1],
      longitude: s.maneuver.location[0],
    },
  }));

  return {
    coordinates,
    steps,
    info: {
      distance: (route.distance / 1000).toFixed(1),
      duration: Math.ceil(route.duration / 60),
    },
  };
};
