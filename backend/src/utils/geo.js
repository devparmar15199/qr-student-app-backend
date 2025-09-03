// Haversine formula to calculate distance between two coordinates (in meters)
export const calculateDistance = (coords1, coords2) => {
  if (
    !coords1 || !coords2 ||
    typeof coords1.latitude !== 'number' || typeof coords1.longitude !== 'number' ||
    typeof coords2.latitude !== 'number' || typeof coords2.longitude !== 'number' ||
    coords1.latitude < -90 || coords1.latitude > 90 || coords1.longitude < -180 || coords1.longitude > 180 ||
    coords2.latitude < -90 || coords2.latitude > 90 || coords2.longitude < -180 || coords2.longitude > 180
  ) {
    throw new Error('Invalid coordinates: latitude must be [-90, 90], longitude must be [-180, 180]');
  }
  
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters
  const lat1 = coords1.latitude;
  const lat2 = coords2.latitude;
  const lon1 = coords1.longitude;
  const lon2 = coords2.longitude;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};