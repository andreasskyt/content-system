import { continueRender, delayRender } from "remotion";
import { useEffect, useState } from "react";

const POPPINS_HREF =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Caveat:wght@500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@1,400;1,500&display=swap";

export const FontLoader: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Poppins"));

  useEffect(() => {
    const existing = document.head.querySelector(
      `link[data-brand-poppins="true"]`,
    );
    if (existing) {
      continueRender(handle);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = POPPINS_HREF;
    link.setAttribute("data-brand-poppins", "true");
    link.onload = () => {
      if (typeof document.fonts?.ready?.then === "function") {
        document.fonts.ready.then(() => continueRender(handle));
      } else {
        continueRender(handle);
      }
    };
    link.onerror = () => continueRender(handle);
    document.head.appendChild(link);
  }, [handle]);

  return null;
};
