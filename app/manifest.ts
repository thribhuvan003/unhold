import type { MetadataRoute } from "next";
import { brand } from "@/lib/ui/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.publicName} — bank freeze package`,
    short_name: brand.publicName,
    description:
      "Bank account restricted in India? Organise the facts, relevant papers, and a draft you verify and send yourself.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#2B7DAD",
    lang: "en-IN",
    categories: ["finance", "utilities"],
    orientation: "portrait-primary",
  };
}
