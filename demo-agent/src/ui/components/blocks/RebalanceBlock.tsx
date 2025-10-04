import React from 'react';
import type { RebalanceBlock } from '../../../types/index.js';

export const RebalanceBlockRenderer: React.FC<{ block: RebalanceBlock }> = ({ block }) => {
  return (
    <div className="rebalance-block">
      {block.title && <h3>{block.title}</h3>}

      <div className="allocations">
        <div className="allocation-section">
          <h4>Текущее распределение</h4>
          <table>
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Вес, %</th>
                <th>Стоимость, ₽</th>
              </tr>
            </thead>
            <tbody>
              {block.currentAllocation.map((item, i) => (
                <tr key={i}>
                  <td>{item.symbol}</td>
                  <td>{item.weight.toFixed(1)}%</td>
                  <td>{item.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="allocation-section">
          <h4>Целевое распределение</h4>
          <table>
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Вес, %</th>
                <th>Стоимость, ₽</th>
              </tr>
            </thead>
            <tbody>
              {block.targetAllocation.map((item, i) => (
                <tr key={i}>
                  <td>{item.symbol}</td>
                  <td>{item.weight.toFixed(1)}%</td>
                  <td>{item.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {block.trades.length > 0 && (
        <div className="trades-section">
          <h4>Необходимые сделки</h4>
          <table>
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Действие</th>
                <th>Количество</th>
                <th>Сумма, ₽</th>
              </tr>
            </thead>
            <tbody>
              {block.trades.map((trade, i) => (
                <tr key={i}>
                  <td>{trade.symbol}</td>
                  <td style={{ color: trade.action === 'BUY' ? '#26a69a' : '#ef5350' }}>
                    {trade.action === 'BUY' ? 'Покупка' : 'Продажа'}
                  </td>
                  <td>{trade.quantity}</td>
                  <td>{trade.estimatedCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
