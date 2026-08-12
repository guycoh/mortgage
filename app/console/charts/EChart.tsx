"use client";

// The one place ECharts is instantiated.
//
// Only the pieces the console actually draws are registered, so the panel does
// not ship the whole library: bars, lines, the custom renderer behind the
// activity axis, and the heat map. Everything else — pies, maps, 3D — stays
// out of the bundle.
//
// Two behaviours worth knowing about:
//
//  · Resize is observed, not listened for on window. The rail is fixed and the
//    content column changes width on its own (drawer open, scrollbar appear),
//    and a window listener misses both.
//  · Options are set with `notMerge` false and `replaceMerge` on series, so a
//    filter that removes a series actually removes it instead of leaving the
//    old one drawn underneath.

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, CustomChart, HeatmapChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([
  BarChart,
  LineChart,
  CustomChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export type { EChartsCoreOption };
export { echarts };

export default function EChart({
  option,
  height,
  onEvents,
  className,
}: {
  option: EChartsCoreOption;
  height: number;
  /** Map of ECharts event name → handler, bound once per instance. */
  onEvents?: Record<string, (params: any) => void>;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const handlers = useRef(onEvents);
  handlers.current = onEvents;

  useEffect(() => {
    if (!host.current) return;
    const inst = echarts.init(host.current, undefined, {
      renderer: "canvas",
      // Charts sit on white cards; an opaque background lets canvas take the
      // fast path instead of compositing every frame against the page.
      useDirtyRect: true,
    });
    chart.current = inst;

    // One dispatcher per event name — re-binding on every render would leak
    // listeners, so the live handler is read through a ref instead.
    const names = Object.keys(handlers.current ?? {});
    for (const name of names) {
      inst.on(name, (params: any) => handlers.current?.[name]?.(params));
    }

    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(host.current);

    return () => {
      ro.disconnect();
      inst.dispose();
      chart.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, {
      replaceMerge: ["series", "xAxis", "yAxis", "visualMap"],
    });
  }, [option]);

  useEffect(() => {
    chart.current?.resize();
  }, [height]);

  return (
    <div
      ref={host}
      className={className}
      style={{ width: "100%", height }}
      dir="ltr"
    />
  );
}
