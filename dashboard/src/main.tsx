import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { App as LegacyApp } from "./legacy-app.js";
import { DashboardV2 } from "./v2/DashboardV2.js";
import "./styles.css";

const Root = () => {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Simple router based on hash
  if (route === "#legacy") {
    return <LegacyApp />;
  }

  // Default to V2 Overview
  return <DashboardV2 />;
};

const container = document.getElementById("app");
if (!container) {
  throw new Error("Dashboard root element '#app' not found");
}

render(<Root />, container);
