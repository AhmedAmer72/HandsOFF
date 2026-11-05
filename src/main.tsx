import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { hydrate } from "./game/store";
import "./styles.css";

function Root() {
  useEffect(() => {
    void hydrate();
  }, []);
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
