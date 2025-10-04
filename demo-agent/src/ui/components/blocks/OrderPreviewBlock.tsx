import React, { useState, useEffect } from 'react';
import type { OrderPreviewBlock } from '../../../types/index.js';

interface OrderPreviewBlockRendererProps {
  block: OrderPreviewBlock;
  onConfirm: (token: string) => void;
  onCancel: () => void;
}

export const OrderPreviewBlockRenderer: React.FC<OrderPreviewBlockRendererProps> = ({
  block,
  onConfirm,
  onCancel
}) => {
  const [understood, setUnderstood] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          onCancel();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onCancel]);

  return (
    <div className="order-preview-block">
      <h3>Подтверждение заявки</h3>
      <div className="order-details">
        <div><strong>Инструмент:</strong> {block.order.symbol}</div>
        <div><strong>Направление:</strong> {block.order.side === 'BUY' ? 'Покупка' : 'Продажа'}</div>
        <div><strong>Количество:</strong> {block.order.quantity}</div>
        <div><strong>Тип:</strong> {block.order.type}</div>
        {block.order.price && <div><strong>Цена:</strong> {block.order.price} ₽</div>}
        <div><strong>Сумма:</strong> {block.order.estimated_total} ₽</div>
        <div><strong>Комиссия:</strong> {block.order.estimated_commission} ₽</div>
      </div>
      {block.warnings.length > 0 && (
        <div className="warnings">
          {block.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}
      <label className="risk-checkbox">
        <input
          type="checkbox"
          checked={understood}
          onChange={e => setUnderstood(e.target.checked)}
        />
        Я понимаю риски
      </label>
      <div className="actions">
        <button
          disabled={!understood}
          onClick={() => onConfirm(block.confirmToken)}
          className="confirm-button"
        >
          Подтвердить ({countdown}с)
        </button>
        <button onClick={onCancel} className="cancel-button">
          Отменить
        </button>
      </div>
    </div>
  );
};
