import React from 'react';
import PropTypes from 'prop-types';

import styles from './OrderPartitionFigure.module.scss';

/**
 * 分区顺序消费（Partition Order）。
 *
 * 一屏讲清「为什么按业务 key 哈希分区，就能既保序又有吞吐」：
 *   ① 要解决的问题 —— 同一订单的「创建 → 支付 → 发货」必须按序处理；
 *   ② 路由表 —— 订单按 hash(orderId) % 分区数 落到某个分区，同一订单必落同一分区；
 *   ③ 分区内 —— FIFO 队列 + 单线程串行消费，顺序天然成立；
 *   ④ 全局顺序 vs 分区顺序的取舍，以及「分区数别随便改」这个坑。
 *
 * 早先这里是「点按钮发消息」的交互沙盘：要连点 6 次才看得到全貌，消息还是逐条冒出来的，
 * 反而看不清「谁落到哪个分区」。改成静态路由表后一眼就能读完。
 */
const ROUTES = [
  {
    key: 'a',
    order: '订单 A',
    id: '#1001',
    hash: 'hash(1001) % 3 = 0',
    partition: 'Partition 0',
    thread: '消费者线程 0',
    steps: ['创建订单', '用户支付', '商家发货'],
  },
  {
    key: 'b',
    order: '订单 B',
    id: '#1002',
    hash: 'hash(1002) % 3 = 1',
    partition: 'Partition 1',
    thread: '消费者线程 1',
    steps: ['创建订单', '用户支付', '商家发货'],
  },
  {
    key: 'c',
    order: '订单 C',
    id: '#1003',
    hash: 'hash(1003) % 3 = 2',
    partition: 'Partition 2',
    thread: '消费者线程 2',
    steps: ['创建订单', '用户支付', '商家发货'],
  },
];

const OrderPartitionFigure = function ({ caption = '' }) {
  return (
    <div className={styles.opf}>
      <div className={styles['opf-problem']}>
        <span className={styles['opf-problem-tag']}>要解决的问题</span>
        <p className={styles['opf-problem-text']}>
          同一笔订单会依次发出「创建 → 支付 → 发货」三条消息，必须按这个顺序处理；
          一旦乱序，就会出现「先发货、后创建」这种业务事故。
        </p>
      </div>

      <div className={styles['opf-head']}>
        <span>订单消息</span>
        <span>哈希路由</span>
        <span>分区（Partition）· 分区内 FIFO</span>
      </div>

      <div className={styles['opf-routes']}>
        {ROUTES.map((route) => (
          <div key={route.key} className={`${styles['opf-row']} ${styles[`opf-row--${route.key}`]}`}>
            <div className={styles['opf-order']}>
              <span className={styles['opf-order-name']}>{route.order}</span>
              <span className={styles['opf-order-id']}>{route.id}</span>
            </div>

            <div className={styles['opf-hash']}>
              <code>{route.hash}</code>
            </div>

            <div className={styles['opf-partition']}>
              <div className={styles['opf-partition-head']}>
                <span className={styles['opf-partition-name']}>{route.partition}</span>
                <span className={styles['opf-thread']}>🧵 {route.thread} · 串行</span>
              </div>
              <div className={styles['opf-steps']}>
                {route.steps.map((step, index) => (
                  <React.Fragment key={step}>
                    {index > 0 && <span className={styles['opf-step-arrow']}>→</span>}
                    <span className={styles['opf-step']}>{step}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles['opf-compare']}>
        <div className={`${styles['opf-cmp']} ${styles['opf-cmp--bad']}`}>
          <div className={styles['opf-cmp-title']}>❌ 全局顺序</div>
          <p>
            Topic 只能留 1 个分区、1 个消费者线程，所有订单挤在一条队列里排队，
            吞吐直接掉到几百 TPS，生产上不现实。
          </p>
        </div>

        <div className={`${styles['opf-cmp']} ${styles['opf-cmp--good']}`}>
          <div className={styles['opf-cmp-title']}>✅ 分区顺序</div>
          <p>
            同一个订单 key 相同，哈希后必落同一分区，分区内单线程串行 → 顺序天然成立；
            不同订单分散到不同分区并行消费，吞吐随分区数扩展。
          </p>
        </div>
      </div>

      <div className={styles['opf-note']}>
        <span className={styles['opf-note-tag']}>⚠️ 别踩的坑</span>
        分区数不要随便改：<code>hash(orderId) % 分区数</code> 的分母一变，
        原来同 key 的消息就可能落到别的分区，顺序立刻错乱。
      </div>

      <div className={styles['opf-key']}>
        一句话记住：顺序只需要保证到「同一个业务 key」这一层，不需要全局有序。
      </div>

      {caption && <div className={styles['opf-caption']}>{caption}</div>}
    </div>
  );
};

OrderPartitionFigure.propTypes = {
  caption: PropTypes.string,
};

export default OrderPartitionFigure;
