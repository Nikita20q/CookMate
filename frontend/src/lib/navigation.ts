import type { NavigationItem } from "@/types/navigation";

import { ChefHat, Heart, ScanLine } from "lucide-react";

export const NAV_ITEMS: NavigationItem[] = [
  { label: "Сканировать", to: "/", icon: ScanLine },
  { label: "Рецепты", to: "/recipes", icon: ChefHat },
  { label: "Избранное", to: "/favorites", icon: Heart },
];
