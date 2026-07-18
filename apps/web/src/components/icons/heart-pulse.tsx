"use client";

// Ícone animado (Motion) baseado no lucide-animated.com (heart-pulse).
// Adaptado: `cn` do @bloomy/ui e prop `animate` para rodar em loop contínuo
// (o original só anima no hover) — usado no LoadingOverlay da Saúde.

import { motion, useAnimation, type Variants } from "motion/react";
import type { HTMLAttributes } from "react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";

import { cn } from "@bloomy/ui/lib/utils";

export interface HeartPulseIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HeartPulseIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  /** Roda a animação em loop contínuo (para estados de carregamento). */
  animate?: boolean;
}

// Batida do coração: escala o ícone inteiro em ritmo de pulso.
const BEAT_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 1.15, 1, 1.15, 1],
    transition: {
      duration: 1.4,
      ease: "easeInOut",
      repeat: Number.POSITIVE_INFINITY,
    },
  },
};

// Linha do pulso (ECG): desenha da esquerda pra direita, em loop.
const PULSE_VARIANTS: Variants = {
  normal: { pathLength: 1, opacity: 1 },
  animate: {
    pathLength: [0, 1],
    opacity: [0.3, 1],
    transition: {
      duration: 1.4,
      ease: "easeInOut",
      repeat: Number.POSITIVE_INFINITY,
    },
  },
};

const HeartPulseIcon = forwardRef<HeartPulseIconHandle, HeartPulseIconProps>(
  (
    { onMouseEnter, onMouseLeave, className, size = 28, animate, ...props },
    ref,
  ) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(e); // sempre repassa ao consumidor
        if (!isControlledRef.current) controls.start("animate");
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseLeave?.(e); // sempre repassa ao consumidor
        if (!isControlledRef.current) controls.start("normal");
      },
      [controls, onMouseLeave],
    );

    // Em modo loop, animamos direto para "animate" (repeat infinito) e ignoramos o hover.
    const anim = animate ? "animate" : controls;

    return (
      <div
        className={cn(className)}
        onMouseEnter={animate ? onMouseEnter : handleMouseEnter}
        onMouseLeave={animate ? onMouseLeave : handleMouseLeave}
        {...props}
      >
        <motion.svg
          fill="none"
          height={size}
          width={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            overflow: "visible",
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
          animate={anim}
          initial="normal"
          variants={BEAT_VARIANTS}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <motion.path
            d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"
            animate={anim}
            initial="normal"
            variants={PULSE_VARIANTS}
          />
        </motion.svg>
      </div>
    );
  },
);

HeartPulseIcon.displayName = "HeartPulseIcon";

export { HeartPulseIcon };
