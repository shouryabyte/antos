import { useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { autoExpireInvitations } from "../lib/onboardingAutomation";
import { routes } from "./routes";
export default function App() {
  useEffect(() => {
    autoExpireInvitations();
  }, []);
  return useRoutes(routes);
}
