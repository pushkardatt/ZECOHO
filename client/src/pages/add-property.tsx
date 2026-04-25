import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AddProperty() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/owner/choose-mode");
  }, [setLocation]);

  return null;
}
