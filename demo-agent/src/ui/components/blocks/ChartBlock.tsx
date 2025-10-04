import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { createChart } from 'lightweight-charts';
import type { ChartBlock } from '../../../types/index.js';

export const ChartBlockRenderer: React.FC<{ block: ChartBlock }> = ({ block }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (block.engine === 'echarts') {
      const chart = echarts.init(containerRef.current);
      chart.setOption(block.spec);

      // Handle resize
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }

    if (block.engine === 'lightweight') {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 400,
        ...(block.spec.layout || {}),
      });

      // Add series from spec
      block.spec.series?.forEach((s: any) => {
        let series;
        switch (s.type) {
          case 'Area':
            series = (chart as any).addAreaSeries({
              lineColor: s.lineColor,
              topColor: s.topColor,
              bottomColor: s.bottomColor,
            });
            break;
          case 'Line':
            series = (chart as any).addLineSeries({
              color: s.lineColor,
              lineStyle: s.lineStyle,
              lineWidth: s.lineWidth,
            });
            break;
          case 'Candlestick':
            series = (chart as any).addCandlestickSeries();
            break;
          default:
            return;
        }

        if (series && s.data) {
          series.setData(s.data);
        }

        // Add markers if present (for trade points)
        if (series && block.markers && block.markers.length > 0) {
          series.setMarkers(block.markers);
        }
      });

      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, [block]);

  return (
    <div className="chart-block">
      {block.title && <h3>{block.title}</h3>}
      <div ref={containerRef} style={{ width: '100%', height: '400px' }}/>
    </div>
  );
};
