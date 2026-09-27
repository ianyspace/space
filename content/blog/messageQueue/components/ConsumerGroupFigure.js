import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './ConsumerGroupFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * Interactive model showing:
 * 1. Queue (Point-to-Point): 1 queue, competing workers (each msg consumed by only 1 worker).
 * 2. Topic (Pub-Sub): 1 topic, independent subscribers (each subscriber gets all msgs).
 * 3. Modern Cluster (Topic + Partitions + Consumer Groups):
 *    - In the same Consumer Group, partitions are distributed (competing / load balanced).
 *    - Across different Consumer Groups, messages are broadcast (Pub-Sub).
 */
const ConsumerGroupFigure = function ({ caption = '' }) {
  const [mode, setMode] = useState('cluster'); // 'p2p' | 'pubsub' | 'cluster'
  const [msgCount, setMsgCount] = useState(0);
  const [log, setLog] = useState('点击「发送一条消息」，观察不同模型下消息如何在队列与消费者间分发。');

  // Stats for Point-to-Point
  const [p2pWorkerIdx, setP2pWorkerIdx] = useState(0);
  const [p2pStats, setP2pStats] = useState([0, 0]);

  // Stats for Pub-Sub
  const [pubSubStats, setPubSubStats] = useState([0, 0, 0]);

  // Stats for Cluster Mode
  // Group A (2 consumers): C1 handles P0 & P1, C2 handles P2
  // Group B (1 consumer): C3 handles P0, P1, P2
  const [clusterP0, setClusterP0] = useState([]);
  const [clusterP1, setClusterP1] = useState([]);
  const [clusterP2, setClusterP2] = useState([]);
  const [c1Count, setC1Count] = useState(0);
  const [c2Count, setC2Count] = useState(0);
  const [c3Count, setC3Count] = useState(0);
  const [activeConsumer, setActiveConsumer] = useState(null);

  const reset = () => {
    setMsgCount(0);
    setP2pStats([0, 0]);
    setPubSubStats([0, 0, 0]);
    setClusterP0([]);
    setClusterP1([]);
    setClusterP2([]);
    setC1Count(0);
    setC2Count(0);
    setC3Count(0);
    setActiveConsumer(null);
    setLog('已重置状态。点击「发送一条消息」体验分发流程。');
  };

  const switchMode = (m) => {
    setMode(m);
    reset();
  };

  const sendMsg = () => {
    const id = msgCount + 1;
    setMsgCount(id);

    if (mode === 'p2p') {
      const targetWorker = p2pWorkerIdx;
      const nextIdx = (p2pWorkerIdx + 1) % 2;
      setP2pWorkerIdx(nextIdx);
      setP2pStats((prev) => {
        const next = [...prev];
        next[targetWorker] += 1;
        return next;
      });
      setActiveConsumer(`w${targetWorker}`);
      setLog(`点对点模式：消息 #${id} 进队，被【消费者 ${targetWorker + 1}】抢占拉取。另外的消费者不会重复收到。`);
      return;
    }

    if (mode === 'pubsub') {
      setPubSubStats((prev) => prev.map((c) => c + 1));
      setActiveConsumer('all');
      setLog(`发布订阅模式：消息 #${id} 发布到 Topic，【邮件、短信、积分服务】三方各自全量收到该消息。`);
      return;
    }

    // Cluster Mode
    // Route by round-robin into 3 partitions (0, 1, 2)
    const pIdx = (id - 1) % 3;
    if (pIdx === 0) setClusterP0((prev) => [...prev.slice(-3), id]);
    if (pIdx === 1) setClusterP1((prev) => [...prev.slice(-3), id]);
    if (pIdx === 2) setClusterP2((prev) => [...prev.slice(-3), id]);

    // Consumer allocation:
    // Group A: C1 owns P0, P1; C2 owns P2
    // Group B: C3 owns P0, P1, P2
    if (pIdx === 0 || pIdx === 1) {
      setC1Count((c) => c + 1);
      setActiveConsumer('c1');
    } else {
      setC2Count((c) => c + 1);
      setActiveConsumer('c2');
    }
    setC3Count((c) => c + 1);

    const targetC = pIdx === 2 ? '消费者 A2 (专享 P2)' : '消费者 A1 (负责 P0, P1)';
    setLog(
      `集群消费组：消息 #${id} 路由到 Partition ${pIdx}。` +
      `【组 A】分流给 ${targetC}（组内竞争）；【组 B】独享消费者 B1 也会全量收到（跨组广播）。`
    );
  };

  return (
    <div className={styles.cgf}>
      <div className={styles['cgf-header']}>
        <div className={styles['cgf-title']}>
          <span>消息分发模型对比沙盘</span>
          <span className={styles['cgf-badge']}>交互演示</span>
        </div>
        <div className={styles['cgf-tabs']}>
          <button
            type="button"
            className={cx('cgf-tab', mode === 'cluster' && 'active')}
            onClick={() => switchMode('cluster')}
          >
            现代集群消费组 (推荐)
          </button>
          <button
            type="button"
            className={cx('cgf-tab', mode === 'pubsub' && 'active')}
            onClick={() => switchMode('pubsub')}
          >
            传统发布订阅 (Topic)
          </button>
          <button
            type="button"
            className={cx('cgf-tab', mode === 'p2p' && 'active')}
            onClick={() => switchMode('p2p')}
          >
            点对点队列 (Queue)
          </button>
        </div>
      </div>

      <div className={styles['cgf-actions']}>
        <button type="button" className={styles['cgf-btn']} onClick={sendMsg}>
          📨 发送一条消息 (已发 {msgCount})
        </button>
        <button type="button" className={styles['cgf-btn-reset']} onClick={reset}>
          重置
        </button>
      </div>

      <div className={styles['cgf-stage']}>
        {/* Producer Column */}
        <div className={styles['col-producer']}>
          <div className={styles['col-title']}>
            <span>1. 生产者</span>
          </div>
          <div className={styles['producer-box']}>
            <div className={styles['producer-icon']}>🚀</div>
            <div className={styles['producer-tag']}>业务服务 Producer</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>连续点击发信</div>
          </div>
        </div>

        {/* Broker / Queue Column */}
        <div className={styles['col-broker']}>
          <div className={styles['col-title']}>
            <span>2. MQ Broker 存储通道</span>
          </div>

          {mode === 'p2p' && (
            <div className={styles['queue-card']}>
              <div className={styles['queue-title']}>
                <span>单队列：OrderQueue</span>
                <span>点对点竞争</span>
              </div>
              <div className={styles['queue-items']}>
                {msgCount === 0 ? (
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>队列空闲</span>
                ) : (
                  <span className={cx('msg-pill', 'pill-p1')}>最新 Msg #{msgCount}</span>
                )}
              </div>
            </div>
          )}

          {mode === 'pubsub' && (
            <div className={styles['queue-card']}>
              <div className={styles['queue-title']}>
                <span>主题：UserRegisteredTopic</span>
                <span>广播广播</span>
              </div>
              <div className={styles['queue-items']}>
                {msgCount === 0 ? (
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>队列空闲</span>
                ) : (
                  <span className={cx('msg-pill', 'pill-p2')}>广播 Msg #{msgCount}</span>
                )}
              </div>
            </div>
          )}

          {mode === 'cluster' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className={styles['queue-card']}>
                <div className={styles['queue-title']}>
                  <span>Partition 0</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>P0</span>
                </div>
                <div className={styles['queue-items']}>
                  {clusterP0.length === 0 ? (
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>空</span>
                  ) : (
                    clusterP0.map((id) => (
                      <span key={id} className={cx('msg-pill', 'pill-p1')}>
                        #{id}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className={styles['queue-card']}>
                <div className={styles['queue-title']}>
                  <span>Partition 1</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>P1</span>
                </div>
                <div className={styles['queue-items']}>
                  {clusterP1.length === 0 ? (
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>空</span>
                  ) : (
                    clusterP1.map((id) => (
                      <span key={id} className={cx('msg-pill', 'pill-p2')}>
                        #{id}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className={styles['queue-card']}>
                <div className={styles['queue-title']}>
                  <span>Partition 2</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>P2</span>
                </div>
                <div className={styles['queue-items']}>
                  {clusterP2.length === 0 ? (
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>空</span>
                  ) : (
                    clusterP2.map((id) => (
                      <span key={id} className={cx('msg-pill', 'pill-p3')}>
                        #{id}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Consumer Column */}
        <div className={styles['col-consumer']}>
          <div className={styles['col-title']}>
            <span>3. 消费端接收</span>
          </div>

          {mode === 'p2p' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                className={cx(
                  'consumer-item',
                  activeConsumer === 'w0' && 'active-consume'
                )}
              >
                <div className={styles['consumer-head']}>
                  <span>消费者 Worker 1</span>
                  <span className={styles['consumer-stats']}>累计: {p2pStats[0]} 条</span>
                </div>
                <div className={styles['consumer-last']}>
                  {p2pWorkerIdx === 1 ? '🎯 刚消费完成' : '等待调度'}
                </div>
              </div>

              <div
                className={cx(
                  'consumer-item',
                  activeConsumer === 'w1' && 'active-consume'
                )}
              >
                <div className={styles['consumer-head']}>
                  <span>消费者 Worker 2</span>
                  <span className={styles['consumer-stats']}>累计: {p2pStats[1]} 条</span>
                </div>
                <div className={styles['consumer-last']}>
                  {p2pWorkerIdx === 0 && msgCount > 0 ? '🎯 刚消费完成' : '等待调度'}
                </div>
              </div>
            </div>
          )}

          {mode === 'pubsub' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className={styles['consumer-item']}>
                <div className={styles['consumer-head']}>
                  <span>订阅者 1：发邮件服务</span>
                  <span className={styles['consumer-stats']}>累计: {pubSubStats[0]} 条</span>
                </div>
              </div>
              <div className={styles['consumer-item']}>
                <div className={styles['consumer-head']}>
                  <span>订阅者 2：发短信服务</span>
                  <span className={styles['consumer-stats']}>累计: {pubSubStats[1]} 条</span>
                </div>
              </div>
              <div className={styles['consumer-item']}>
                <div className={styles['consumer-head']}>
                  <span>订阅者 3：送积分服务</span>
                  <span className={styles['consumer-stats']}>累计: {pubSubStats[2]} 条</span>
                </div>
              </div>
            </div>
          )}

          {mode === 'cluster' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Group A */}
              <div className={styles['group-wrap']}>
                <div className={styles['group-name']}>
                  <span>消费组 Group A (核心订单处理)</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>组内负载均衡</span>
                </div>
                <div
                  className={cx(
                    'consumer-item',
                    activeConsumer === 'c1' && 'active-consume'
                  )}
                >
                  <div className={styles['consumer-head']}>
                    <span>实例 A1 (负责 P0, P1)</span>
                    <span className={styles['consumer-stats']}>{c1Count} 条</span>
                  </div>
                </div>
                <div
                  className={cx(
                    'consumer-item',
                    activeConsumer === 'c2' && 'active-consume'
                  )}
                >
                  <div className={styles['consumer-head']}>
                    <span>实例 A2 (负责 P2)</span>
                    <span className={styles['consumer-stats']}>{c2Count} 条</span>
                  </div>
                </div>
              </div>

              {/* Group B */}
              <div className={styles['group-wrap']}>
                <div className={styles['group-name']}>
                  <span>消费组 Group B (审计/大数据归档)</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>独立订阅全量</span>
                </div>
                <div className={styles['consumer-item']}>
                  <div className={styles['consumer-head']}>
                    <span>实例 B1 (负责全部 P0~P2)</span>
                    <span className={styles['consumer-stats']}>{c3Count} 条 (100%全量)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles['cgf-explain']}>
        <div><strong>💡 核心考点：</strong></div>
        <div className={styles['cgf-log']}>{log}</div>
        <div style={{ marginTop: '6px', opacity: 0.85 }}>
          {mode === 'cluster' &&
            'Kafka 与 RocketMQ 的终极模型：同一个消费组内部，每个分区同一时刻只分配给一个消费者（点对点分流）；不同消费组之间相互独立（广播发布订阅）。这就是既能横向水平扩容、又能实现多系统各取所需的核心设计。'}
          {mode === 'pubsub' &&
            '发布订阅（Pub/Sub）：每个订阅者独立消费一份完整的拷贝。适用于事件广播通知（如新用户注册、订单已支付）。'}
          {mode === 'p2p' &&
            '点对点（Queue）：消息只能被一个工作者消费，消费后即出队不可见。适用于多 Worker 抢占任务负载分摊。'}
        </div>
      </div>

      {caption && <div style={{ textAlign: 'center', fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>{caption}</div>}
    </div>
  );
};

ConsumerGroupFigure.propTypes = {
  caption: PropTypes.string,
};

export default ConsumerGroupFigure;
