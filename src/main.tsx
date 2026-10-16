import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@excalidraw/excalidraw/index.css";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
