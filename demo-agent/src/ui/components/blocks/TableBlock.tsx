import React, { useState, useRef, useEffect } from 'react';
import type { TableBlock, TableColumn } from '../../../types/index.js';

// Simple Canvas-based Sparkline component
const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = data[data.length - 1] >= data[0] ? '#26a69a' : '#ef5350';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    data.forEach((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data]);

  return <canvas ref={canvasRef} width={80} height={30} style={{ display: 'block' }} />;
};

export const TableBlockRenderer: React.FC<{ block: TableBlock }> = ({ block }) => {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedRows = block.sortable && sortBy
    ? [...block.rows].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        // Handle numeric comparison
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortDir === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      })
    : block.rows;

  const handleSort = (columnId: string) => {
    if (!block.sortable) return;
    if (sortBy === columnId) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDir('asc');
    }
  };

  const renderCell = (col: TableColumn, value: any) => {
    if (col.type === 'sparkline' && Array.isArray(value)) {
      return <Sparkline data={value} />;
    }
    if (col.type === 'currency') {
      const num = parseFloat(value);
      return isNaN(num) ? value : `${num.toFixed(2)} ₽`;
    }
    if (col.type === 'percent') {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      const color = num >= 0 ? '#26a69a' : '#ef5350';
      return <span style={{ color }}>{num >= 0 ? '+' : ''}{num.toFixed(2)}%</span>;
    }
    return value;
  };

  return (
    <div className="table-block">
      {block.title && <h3>{block.title}</h3>}
      <table>
        <thead>
          <tr>
            {block.columns.map(col => (
              <th
                key={col.id}
                onClick={() => handleSort(col.id)}
                style={{ cursor: block.sortable ? 'pointer' : 'default' }}
              >
                {col.label}
                {sortBy === col.id && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={i}>
              {block.columns.map(col => (
                <td key={col.id}>{renderCell(col, row[col.id])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
