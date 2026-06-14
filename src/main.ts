import "./styles.css";
import { renderHomePage } from "./homepage";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

renderHomePage(app);
