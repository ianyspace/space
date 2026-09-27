import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './OrderPartitionFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * Order events sequences:
 * Order A (ID: 1001) -> hash(1001) % 3 = 1 -> Partition 1
 * Order B (ID: 1002) -> hash(1002) % 3 = 2 -> Partition 2
 * Order C (ID: 1003) -> hash(1003) % 3 = 0 -> Partition 0
 */
const OrderPartitionFigure = function ({ caption = '' }) {
  const [p0, setP0] = useState([]);
  const [p1, setP1] = useState([]);
  const [p2, setP2] = useState([]);

  const [stepA, setStepA] = useState(0); // 0: none, 1: create, 2: pay, 3: ship
  const [stepB, setStepB] = useState(0);
  const [log, setLog] = useState('点击下方按钮发送订单消息，直观感受「按 OrderId 哈希保顺序」的魔力。');

  const reset = () => {
    setP0([]);
    setP1([]);
    setP2([]);
    setStepA(0);
    setStepB(0);
    setLog('已清空所有队列消息。请点击按钮重新发送。');
  };

  const sendOrderA = () => {
    if (stepA >= 3) {
      setLog('订单 A (ID: 1001) 的生命周期（创建 → 支付 → 发货）已全部发送完成！');
      return;
    }
    const nextStep = stepA + 1;
    setStepA(nextStep);
    const actionName = nextStep === 1 ? '1. 创建订单' : nextStep === 2 ? '2. 用户支付' : '3. 商家发货';

    // Route: hash("1001") % 3 = 1
    const item = { order: 'A', id: '1001', action: actionName, step: nextStep };
    setP1((prev) => [...prev, item]);
    setLog(`【订单 A】发送「${actionName}」：路由到 Partition 1。由于 FIFO 队列特性，消费线程必定严格串行执行！`);
  };

  const sendOrderB = () => {
    if (stepB >= 3) {
      setLog('订单 B (ID: 1002) 的生命周期已全部发送完成！');
      return;
    }
    const nextStep = stepB + 1;
    setStepB(nextStep);
    const actionName = nextStep === 1 ? '1. 创建订单' : nextStep === 2 ? '2. 用户支付' : '3. 商家发货';

    // Route: hash("1002") % 3 = 2
    const item = { order: 'B', id: '1002', action: actionName, step: nextStep };
    setP2((prev) => [...prev, item]);
    setLog(`【订单 B】发送「${actionName}」：路由到 Partition 2。与订单 A 完全并行处理，互不阻塞卡顿！`);
  };

  return (
    <div className={styles.opf}>
      <div className={styles['opf-header']}>
        <div className={styles['opf-title']}>
          <span>分区顺序消费（Partition Order）沙盘演示</span>
          <span className={styles['opf-badge']}>高频高分题</span>
        </div>
        <div style={{ fontSize: '12px', opacity: 0.75 }}>
          分区哈希路由：<code>hash(orderId) % partitionCount</code>
        </div>
      </div>

      <div className={styles['opf-controls']}>
        <button
          type="button"
          className={cx('order-btn', 'btn-a')}
          onClick={sendOrderA}
          disabled={stepA >= 3}
        >
          <span>📦 发送订单 A (ID: 1001) 下一步事件</span>
          <span style={{ opacity: 0.8 }}>({stepA}/3)</span>
        </button>

        <button
          type="button"
          className={cx('order-btn', 'btn-b')}
          onClick={sendOrderB}
          disabled={stepB >= 3}
        >
          <span>🛍️ 发送订单 B (ID: 1002) 下一步事件</span>
          <span style={{ opacity: 0.8 }}>({stepB}/3)</span>
        </button>

        <button
          type="button"
          className={cx('order-btn', 'btn-reset')}
          onClick={reset}
        >
          重置沙盘
        </button>
      </div>

      <div className={styles['opf-stage']}>
        {/* Partition 0 */}
        <div className={styles['partition-card']}>
          <div className={styles['p-head']}>
            <span>Partition 0</span>
            <span className={styles['p-tag']}>其他业务消息</span>
          </div>
          <div className={styles['msg-queue']}>
            {p0.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: '12px', margin: 'auto' }}>暂无消息</div>
            ) : (
              p0.map((m, idx) => (
                <div key={idx} className={cx('msg-item', 'item-c')}>
                  <span>{m.action}</span>
                </div>
              ))
            )}
          </div>
          <div className={styles['consumer-badge']}>
            <span>🧵 消费者线程 0</span>
            <span style={{ color: 'var(--opf-accent)' }}>单线程串行</span>
          </div>
        </div>

        {/* Partition 1 (Order A) */}
        <div className={styles['partition-card']}>
          <div className={styles['p-head']}>
            <span>Partition 1</span>
            <span className={styles['p-tag']}>绑归 订单 A (1001)</span>
          </div>
          <div className={styles['msg-queue']}>
            {p1.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: '12px', margin: 'auto' }}>点击按钮入队</div>
            ) : (
              p1.map((m, idx) => (
                <div key={idx} className={cx('msg-item', 'item-a')}>
                  <span>Order#1001</span>
                  <strong>{m.action}</strong>
                </div>
              ))
            )}
          </div>
          <div className={styles['consumer-badge']}>
            <span>🧵 消费者线程 1</span>
            <span style={{ color: 'var(--opf-ord-a)' }}>严格 FIFO 消费</span>
          </div>
        </div>

        {/* Partition 2 (Order B) */}
        <div className={styles['partition-card']}>
          <div className={styles['p-head']}>
            <span>Partition 2</span>
            <span className={styles['p-tag']}>绑归 订单 B (1002)</span>
          </div>
          <div className={styles['msg-queue']}>
            {p2.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: '12px', margin: 'auto' }}>点击按钮入队</div>
            ) : (
              p2.map((m, idx) => (
                <div key={idx} className={cx('msg-item', 'item-b')}>
                  <span>Order#1002</span>
                  <strong>{m.action}</strong>
                </div>
              ))
            )}
          </div>
          <div className={styles['consumer-badge']}>
            <span>🧵 消费者线程 2</span>
            <span style={{ color: 'var(--opf-ord-b)' }}>严格 FIFO 消费</span>
          </div>
        </div>
      </div>

      <div className={styles['opf-explain']}>
        <div><strong>💡 核心流程播报：</strong> {log}</div>
        <div style={{ marginTop: '6px', opacity: 0.85 }}>
          <strong>为什么不能用“全局顺序”？</strong> 全局顺序要求 Topic 只能有 1 个 Partition、1 个消费者线程，系统 TPS 直接降到几百！<br />
          <strong>分区顺序的精髓：</strong> 业务上真正需要时序的只有「同一笔订单」（你绝不希望先发货再创建）。把 <code>orderId</code> 作为 key 哈希，同订单天然落入同一分区，分区内单线程串行处理保顺序；不同订单分流到不同分区并发执行，吞吐量翻倍！
        </div>
      </div>

      {caption && (
        <div style={{ textAlign: 'center', fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
          {caption}
        </div>
      )}
    </div>
  );
};

OrderPartitionFigure.propTypes = {
  caption: PropTypes.string,
};

export default OrderPartitionFigure;
