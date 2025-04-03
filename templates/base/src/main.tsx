import { ViteReactSSG } from "vite-react-ssg/single-page";
import { App } from "./app.tsx";
import { Head } from "./head";
import "./index.css";
export const createRoot = ViteReactSSG(
  <>
    <Head />
    <App />
  </>,
  async () => {},
  {
    registerComponents: true,
  }
);
