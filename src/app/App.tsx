import { useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { runAntosAutomation } from "../lib/automation";
import { autoExpireInvitations } from "../lib/onboardingAutomation";
import { routes } from "./routes";
export default function App() {
  useEffect(() => {
    runAntosAutomation();
    autoExpireInvitations();
  }, []);
  return useRoutes(routes);
}
