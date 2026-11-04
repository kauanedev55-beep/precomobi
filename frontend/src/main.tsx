import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles/global.css";
import "./styles/experience.css";
import "./styles/palette.css";
import "./styles/grocery.css";
import "./styles/photos.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
