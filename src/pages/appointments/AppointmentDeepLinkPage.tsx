import { useParams } from "wouter";
import { Dashboard } from "@/pages/Dashboard";

export function PropertyAppointmentDeepLink() {
  const { id } = useParams<{ id: string }>();
  return <Dashboard forcedTab="bookings_properties" highlightAppointmentId={id} />;
}

export function VehicleAppointmentDeepLink() {
  const { id } = useParams<{ id: string }>();
  return <Dashboard forcedTab="bookings_vehicles" highlightAppointmentId={id} />;
}
