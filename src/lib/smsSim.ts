// SMS Simulation and Local Database Store for Real Estate Booking System

export interface RealEstateSlot {
  id: string;
  propertyId: string;
  day: string; // e.g. "Hétfő", "Kedd", etc.
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  type: "viewing" | "consultation" | "other"; // type of appointment
  typeLabel: string;
  isAvailable: boolean;
  isVideoTour: boolean; // Virtual tour via video call
}

export interface RealEstateBooking {
  id: string;
  propertyId: string;
  propertyName: string;
  slotId: string;
  slotTime: string;
  slotDay: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  status: "pending" | "confirmed" | "rejected";
  otpCode: string;
  createdAt: string;
}

// Initial mock slots for the properties
const INITIAL_SLOTS: RealEstateSlot[] = [
  // prop-1 (Penthouse)
  { id: "re-slot-1", propertyId: "prop-1", day: "Hétfő", startTime: "10:00", endTime: "11:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: false },
  { id: "re-slot-2", propertyId: "prop-1", day: "Hétfő", startTime: "14:00", endTime: "15:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: false },
  { id: "re-slot-3", propertyId: "prop-1", day: "Szerda", startTime: "11:00", endTime: "12:00", type: "consultation", typeLabel: "Telefonos egyeztetés", isAvailable: true, isVideoTour: false },
  { id: "re-slot-4", propertyId: "prop-1", day: "Péntek", startTime: "15:00", endTime: "16:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: true }, // Video viewing

  // prop-2 (Scandinavian House)
  { id: "re-slot-5", propertyId: "prop-2", day: "Kedd", startTime: "09:00", endTime: "10:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: false },
  { id: "re-slot-6", propertyId: "prop-2", day: "Kedd", startTime: "13:00", endTime: "14:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: false },
  { id: "re-slot-7", propertyId: "prop-2", day: "Csütörtök", startTime: "16:00", endTime: "17:00", type: "other", typeLabel: "Egyéb egyeztetés", isAvailable: true, isVideoTour: false },

  // prop-3 (Balaton Cottage)
  { id: "re-slot-8", propertyId: "prop-3", day: "Szombat", startTime: "10:00", endTime: "11:30", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: false },
  { id: "re-slot-9", propertyId: "prop-3", day: "Szombat", startTime: "14:00", endTime: "15:30", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true, isVideoTour: false }
];

const INITIAL_BOOKINGS: RealEstateBooking[] = [
  {
    id: "booking-mock-1",
    propertyId: "prop-1",
    propertyName: "Luxus panorámás penthause lakás",
    slotId: "re-slot-2",
    slotTime: "14:00 - 15:00",
    slotDay: "Hétfő",
    clientName: "Szabó János",
    clientPhone: "+36 30 555 1234",
    clientEmail: "szabo.janos@example.hu",
    status: "pending",
    otpCode: "4820",
    createdAt: new Date().toISOString()
  }
];

// Helper database operations
export function getRealEstateSlots(): RealEstateSlot[] {
  const data = localStorage.getItem("ilolit_re_slots");
  if (!data) {
    localStorage.setItem("ilolit_re_slots", JSON.stringify(INITIAL_SLOTS));
    return INITIAL_SLOTS;
  }
  return JSON.parse(data);
}

export function saveRealEstateSlots(slots: RealEstateSlot[]) {
  localStorage.setItem("ilolit_re_slots", JSON.stringify(slots));
}

export function getRealEstateBookings(): RealEstateBooking[] {
  const data = localStorage.getItem("ilolit_re_bookings");
  if (!data) {
    localStorage.setItem("ilolit_re_bookings", JSON.stringify(INITIAL_BOOKINGS));
    return INITIAL_BOOKINGS;
  }
  return JSON.parse(data);
}

export function saveRealEstateBookings(bookings: RealEstateBooking[]) {
  localStorage.setItem("ilolit_re_bookings", JSON.stringify(bookings));
}

// SMS notification dispatcher
export function sendSimulatedSMS(phoneNumber: string, message: string) {
  console.log(`[SMS Simulation] To: ${phoneNumber} | Msg: ${message}`);
  
  // Dispatch custom browser event
  const event = new CustomEvent("ilolit_sms_received", {
    detail: {
      phone: phoneNumber,
      message: message,
      timestamp: new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
    }
  });
  window.dispatchEvent(event);
}

// ================= VEHICLE TYPES & DB LOGIC =================

export interface VehicleSlot {
  id: string;
  vehicleId: string;
  day: string; // e.g. "Hétfő", "Kedd", etc.
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  type: "testdrive" | "viewing" | "consultation";
  typeLabel: string;
  isAvailable: boolean;
}

export interface VehicleBooking {
  id: string;
  vehicleId: string;
  vehicleName: string;
  slotId: string;
  slotTime: string;
  slotDay: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  status: "pending" | "confirmed" | "rejected";
  otpCode: string;
  createdAt: string;
}

const INITIAL_VEHICLE_SLOTS: VehicleSlot[] = [
  // car-1 (Tesla)
  { id: "car-slot-1", vehicleId: "car-1", day: "Hétfő", startTime: "10:00", endTime: "11:00", type: "testdrive", typeLabel: "Tesztvezetés", isAvailable: true },
  { id: "car-slot-2", vehicleId: "car-1", day: "Hétfő", startTime: "13:00", endTime: "14:00", type: "testdrive", typeLabel: "Tesztvezetés", isAvailable: true },
  { id: "car-slot-3", vehicleId: "car-1", day: "Szerda", startTime: "15:00", endTime: "16:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true },
  
  // car-2 (BMW)
  { id: "car-slot-4", vehicleId: "car-2", day: "Kedd", startTime: "09:00", endTime: "10:00", type: "testdrive", typeLabel: "Tesztvezetés", isAvailable: true },
  { id: "car-slot-5", vehicleId: "car-2", day: "Kedd", startTime: "11:00", endTime: "12:00", type: "viewing", typeLabel: "Személyes megtekintés", isAvailable: true },
  { id: "car-slot-6", vehicleId: "car-2", day: "Csütörtök", startTime: "14:00", endTime: "15:00", type: "consultation", typeLabel: "Telefonos egyeztetés", isAvailable: true }
];

const INITIAL_VEHICLE_BOOKINGS: VehicleBooking[] = [
  {
    id: "v-booking-mock-1",
    vehicleId: "car-1",
    vehicleName: "Tesla Model 3 Standard Range Plus",
    slotId: "car-slot-2",
    slotTime: "13:00 - 14:00",
    slotDay: "Hétfő",
    clientName: "Nagy Tibor",
    clientPhone: "+36 20 888 7777",
    clientEmail: "tibor.nagy@example.hu",
    status: "pending",
    otpCode: "9481",
    createdAt: new Date().toISOString()
  }
];

export function getVehicleSlots(): VehicleSlot[] {
  const data = localStorage.getItem("ilolit_vehicle_slots");
  if (!data) {
    localStorage.setItem("ilolit_vehicle_slots", JSON.stringify(INITIAL_VEHICLE_SLOTS));
    return INITIAL_VEHICLE_SLOTS;
  }
  return JSON.parse(data);
}

export function saveVehicleSlots(slots: VehicleSlot[]) {
  localStorage.setItem("ilolit_vehicle_slots", JSON.stringify(slots));
}

export function getVehicleBookings(): VehicleBooking[] {
  const data = localStorage.getItem("ilolit_vehicle_bookings");
  if (!data) {
    localStorage.setItem("ilolit_vehicle_bookings", JSON.stringify(INITIAL_VEHICLE_BOOKINGS));
    return INITIAL_VEHICLE_BOOKINGS;
  }
  return JSON.parse(data);
}

export function saveVehicleBookings(bookings: VehicleBooking[]) {
  localStorage.setItem("ilolit_vehicle_bookings", JSON.stringify(bookings));
}

