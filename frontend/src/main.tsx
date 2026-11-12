import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { PwaProvider } from "./pwa/PwaContext";
import { registerPwa } from "./pwa/register";
import "./styles/global.css";
import "./styles/experience.css";
import "./styles/palette.css";
import "./styles/grocery.css";
import "./styles/photos.css";
import "./styles/produce.css";
import "./styles/responsive.css";
import "./styles/install.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaProvider><App /></PwaProvider>
  </StrictMode>,
);

registerPwa();
