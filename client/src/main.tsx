import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { FaithProvider } from "./context/FaithContext";
import { SavedItemsProvider } from "./context/SavedItemsContext";

createRoot(document.getElementById("root")!).render(
  <FaithProvider>
    <SavedItemsProvider>
      <App />
    </SavedItemsProvider>
  </FaithProvider>
);
