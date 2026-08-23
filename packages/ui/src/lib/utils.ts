import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Os raios e as sombras do Bloomy vivem no `@theme` do globals.css
 * (`--radius-card-lg`, `--shadow-btn`, …) e o tailwind-merge só conhece a escala
 * default do Tailwind. Sem registrar esses nomes aqui, ele não vê `rounded-card-lg`
 * e `rounded-none` como o mesmo grupo: os dois sobrevivem no className e o
 * `rounded-none` que os componentes shadcn trazem na base ganha por ordem de CSS —
 * o canto sai reto por mais que a tela peça o raio do design system.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "card", "card-lg", "sheet"],
      shadow: ["card", "card-sm", "btn", "sheet", "device"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
