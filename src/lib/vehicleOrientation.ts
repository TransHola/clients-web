/**
 * Mandatory System Configuration Rule: Vehicle Orientation & Steering Position
 * 
 * In accordance with TransHola Engineering & Regulatory Constraints:
 * 1. Steering position (Left-Hand Drive vs Right-Hand Drive) is determined automatically
 *    based on the country-specific Driving and Vehicle Orientation settings configured by the Super Admin.
 * 2. In Left-Hand Drive (LHD) markets (e.g. UAE, USA, Saudi Arabia, Europe):
 *    - Driver sits on the LEFT side with the steering wheel and instrument cluster on the LEFT.
 *    - Curbside passenger boarding door and stepwell stairs are strictly on the RIGHT side.
 *    - Conventional school buses follow standard geometry: single front steer axle (2 tires total in front,
 *      NEVER 4 tires in the front) and dual rear axle.
 * 3. In Right-Hand Drive (RHD) markets (e.g. UK, Australia, Indonesia, Japan):
 *    - Driver sits on the RIGHT side with the steering wheel and instrument cluster on the RIGHT.
 *    - Curbside passenger boarding door and stepwell stairs are strictly on the LEFT side.
 * 4. This configuration is consistently enforced across all vehicle representations,
 *    interfaces, and related system modules to prevent customer confusion.
 */

export type DriverSeatPosition = 'Left' | 'Right';
export type DrivingSide = 'Right' | 'Left';
export type VehicleOrientationMode = 'LHD' | 'RHD';

export interface VehicleOrientationConfig {
  countryCode: string;
  countryName: string;
  driverSeat: DriverSeatPosition;
  drivingSide: DrivingSide;
  orientation: VehicleOrientationMode;
  passengerDoorSide: 'Right' | 'Left';
  driverSide: 'Left' | 'Right';
  steeringDescription: string;
  curbsideDescription: string;
  regulatoryLabel: string;
  isLHD: boolean;
  isRHD: boolean;
}

const RHD_COUNTRIES = new Set(['UK', 'GB', 'ID', 'AU', 'NZ', 'JP', 'IN', 'SG', 'MY', 'ZA', 'IE', 'TH']);

export function getVehicleOrientation(countryCode?: string | null): VehicleOrientationConfig {
  const code = (countryCode || 'AE').trim().toUpperCase();
  const isRHD = RHD_COUNTRIES.has(code);

  const countryNameMap: Record<string, string> = {
    AE: 'United Arab Emirates',
    US: 'United States',
    ES: 'Spain',
    FR: 'France',
    DE: 'Germany',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    UK: 'United Kingdom',
    GB: 'United Kingdom',
    ID: 'Indonesia',
    MA: 'Morocco'
  };

  const countryName = countryNameMap[code] || (isRHD ? 'RHD Territory' : 'LHD Territory');
  const driverSeat: DriverSeatPosition = isRHD ? 'Right' : 'Left';
  const drivingSide: DrivingSide = isRHD ? 'Left' : 'Right';
  const orientation: VehicleOrientationMode = isRHD ? 'RHD' : 'LHD';
  const passengerDoorSide: 'Right' | 'Left' = isRHD ? 'Left' : 'Right';
  const driverSide: 'Left' | 'Right' = isRHD ? 'Right' : 'Left';

  return {
    countryCode: code,
    countryName,
    driverSeat,
    drivingSide,
    orientation,
    passengerDoorSide,
    driverSide,
    steeringDescription: isRHD ? 'Right-Hand Drive (RHD Cockpit)' : 'Left-Hand Drive (LHD Cockpit)',
    curbsideDescription: isRHD ? 'Curbside LEFT (Passenger Boarding)' : 'Curbside RIGHT (Passenger Boarding)',
    regulatoryLabel: isRHD 
      ? `RHD • Right-Hand Drive (${countryName} Standard)` 
      : `LHD • Left-Hand Drive (${countryName} Standard)`,
    isLHD: !isRHD,
    isRHD
  };
}

export function getVehicleInteriorPath(vehicleId: string, countryOrOrientation?: string | null): string {
  const cleanId = (vehicleId || 'luxury-motorcoach').replace(/\.(jpg|png|webp)$/i, '');
  let orientation: VehicleOrientationMode = 'LHD';

  if (countryOrOrientation === 'RHD' || countryOrOrientation === 'rhd') {
    orientation = 'RHD';
  } else if (countryOrOrientation === 'LHD' || countryOrOrientation === 'lhd') {
    orientation = 'LHD';
  } else if (countryOrOrientation) {
    orientation = getVehicleOrientation(countryOrOrientation).orientation;
  }

  const subfolder = orientation.toLowerCase();
  return `/images/fleet/interiors/${subfolder}/${cleanId}.jpg?v=orientation_std_v1`;
}

export function getStandardVehicleInteriorPath(vehicleId: string): string {
  const cleanId = (vehicleId || 'luxury-motorcoach').replace(/\.(jpg|png|webp)$/i, '');
  return `/images/fleet/interiors/${cleanId}.jpg?v=orientation_std_v1`;
}
