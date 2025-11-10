import axios from '@/services/axiosService';
import { getStepInstruction } from './stepInstruction';

export const fetchRoute = async (
  start: Coordinate,
  end: Coordinate,
): Promise<{
  coordinates: Coordinate[];
  steps: NavigationStep[];
  info: RouteInfo;
} | null> => {
  try {
    const startStr = `${start.longitude},${start.latitude}`;
    const endStr = `${end.longitude},${end.latitude}`;

    const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson&steps=true`);

    if (!res.data.routes?.[0]) throw new Error('No route found');
    const route = res.data.routes[0];

    const coordinates = route.geometry.coordinates.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    }));

    const steps =
      route.legs?.[0]?.steps?.map((s: any) => ({
        instruction: getStepInstruction(s),
        location: {
          latitude: s.maneuver.location[1],
          longitude: s.maneuver.location[0],
        },
      })) || [];

    const info: RouteInfo = {
      distance: (route.distance / 1000).toFixed(1),
      duration: Math.ceil(route.duration / 60),
    };

    return { coordinates, steps, info };
  } catch (err) {
    console.log('Routing error:', err);
    return null;
  }
};
