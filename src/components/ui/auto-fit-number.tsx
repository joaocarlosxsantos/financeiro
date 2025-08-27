"use client";
import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface AutoFitNumberProps {
  value: string | number;
  className?: string;
  /** tamanho máximo (px) */
  max?: number;
  /** tamanho mínimo (px) */
  min?: number;
  /** passo de redução em px */
  step?: number;
  /** Axis to fit: currently only horizontal */
  horizontalPaddingPx?: number; // padding interno que deve ser considerado
  title?: string;
}

/**
 * Componente que ajusta dinamicamente o font-size para o conteúdo caber em uma linha dentro do container.
 * Usa ResizeObserver para reagir a alterações de tamanho do card.
 */
export function AutoFitNumber({
  value,
  className,
  max = 36,
  min = 14,
  step = 1,
  horizontalPaddingPx = 4,
  title,
}: AutoFitNumberProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [fontSize, setFontSize] = useState(max);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      fit();
    });
    resizeObserver.observe(el);
    fit();
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, max, min, step]);

  const fit = () => {
    const container = wrapperRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    // reset to max for nova medição
    let current = max;
    measure.style.fontSize = current + "px";
    const available = container.clientWidth - horizontalPaddingPx * 2;

    // Evita loop muito longo: limite 200 iterações
    let guard = 0;
    while (current > min && guard < 200) {
      const width = measure.offsetWidth;
      if (width <= available) break;
      current -= step;
      measure.style.fontSize = current + "px";
      guard++;
    }
    setFontSize(current);
  };

  return (
    <div ref={wrapperRef} className={clsx("w-full flex justify-center", className)} title={title}>
      <span
        ref={measureRef}
        style={{ fontSize: fontSize, lineHeight: 1.05 }}
        className={clsx("whitespace-nowrap font-bold tabular-nums", className)}
      >
        {value}
      </span>
    </div>
  );
}
