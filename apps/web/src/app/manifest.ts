import type { MetadataRoute } from "next";

const ICON_SIZES = ["192x192", "512x512"] as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bloomy",
    short_name: "Bloomy",
    description:
      "Acompanhamento diário de bem-estar: hidratação, alimentação, remédios, treino, humor e agenda de saúde.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBFAFE",
    theme_color: "#A78BD0",
    icons: ICON_SIZES.flatMap((sizes) =>
      (["any", "maskable"] as const).map((purpose) => ({
        src: `/favicon/web-app-manifest-${sizes}.png`,
        sizes,
        type: "image/png",
        purpose,
      })),
    ),
  };
}
