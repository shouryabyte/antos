import { useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { runAntosAutomation } from "../lib/automation";
import { routes } from "./routes";
export default function App() {
  useEffect(() => {
    runAntosAutomation();
  }, []);
  return useRoutes(routes);
}
