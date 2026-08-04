"use client";

import { Area, AreaChart, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@bloomy/ui/components/chart";

import { dayLabel, formatKg, type ChartPoint } from "../hooks/peso-helpers";

const CONFIG = {
  kg: { label: "Peso", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

export function PesoChart({ points }: { points: ChartPoint[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-13.5 w-full">
      <AreaChart
        data={points}
        margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id="pesoFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-chart-1)"
              stopOpacity={0.5}
            />
            <stop
              offset="100%"
              stopColor="var(--color-chart-1)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        {/* domínio folgado: sem isso a linha encosta nas bordas e some a variação */}
        <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                dayLabel(String(payload?.[0]?.payload?.day ?? ""))
              }
              // `value` vem em kg (é o que o gráfico plota); volta pra gramas
              // para reusar o `formatKg` — assim tooltip, resumo e histórico
              // mostram sempre uma casa decimal ("65,0 kg", não "65 kg").
              formatter={(value) => `${formatKg(Math.round(Number(value) * 1000))} kg`}
            />
          }
        />
        <Area
          dataKey="kg"
          // reta, não curva: com pesagens espaçadas, curva suave inventa movimento
          type="linear"
          stroke="var(--color-lilac-deep)"
          strokeWidth={2.5}
          fill="url(#pesoFill)"
          dot={false}
          activeDot={{
            r: 4.5,
            fill: "var(--color-lilac-deep)",
            stroke: "#fff",
            strokeWidth: 2.5,
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
