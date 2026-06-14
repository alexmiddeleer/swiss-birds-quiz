import "./styles.css";
import { renderHomePage } from "./homepage";
import catalog from "./birds/catalog.json";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

renderHomePage(app, catalog);
