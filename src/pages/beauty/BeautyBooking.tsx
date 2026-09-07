import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export function BeautyBookingRedirect() {
  const { id } = useParams<{ id: string; serviceId: string }>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(`/beauty/${id}`, { replace: true });
  }, [id, setLocation]);

  return null;
}
