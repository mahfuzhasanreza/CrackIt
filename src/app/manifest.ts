import type { MetadataRoute } from "next";

/** Web app manifest: makes CrackIt installable (Add to Home Screen / Install app). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CrackIt — interview prep tracker",
    short_name: "CrackIt",
    description: "Track every hour of interview prep, for whatever you are preparing for.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#171717",
    categories: ["productivity", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Timer", url: "/timer", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Journal", url: "/journal" },
      { name: "Problems", url: "/problems" },
    ],
  };
}
