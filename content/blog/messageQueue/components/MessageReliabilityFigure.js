import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './MessageReliabilityFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const STAGES = [
  {
    id: 'produce',
    step: '阶段 ① 发送阶段',
    title: '生产者 → Broker',
    desc: '从生产者把消息压入网络，直到 Broker 节点接收',
    risks: [
      '网络偶发抖动、超时、丢包，消息压根没送到 Broker',
      'Broker 处于 GC 卡顿或瞬时高负载，直接拒绝了连接',
      '生产者采用异步发送却没有实现回调异常监听，对失败无感知',
    ],
    solutions: [
      'Kafka 设置 acks=all (或 -1)：必须等待所有 ISR 副本确认写入',
      '开启发送重试：retries=3 + 幂等性参数 enable.idempotence=true',
      'RocketMQ 使用同步发送或事务消息 (Half Message 机制)',
    ],
    code: `// Kafka 生产端高可靠配置
props.put("acks", "all");
props.put("retries", 3);
props.put("enable.idempotence", true); // 配合重试防重复`,
    takeaway: '生产端要点：必须得到 Broker 确切的写入 ACK；失败立即重试，并开启幂等避免重试产生重复消息。',
  },
  {
    id: 'store',
    step: '阶段 ② 存储阶段',
    title: 'Broker 持久化与副本同步',
    desc: '消息到达 Broker 后的磁盘写入与集群副本冗余',
    risks: [
      'Broker 采用操作系统异步刷盘（PageCache），突发断电内存数据直接蒸发',
      'Leader 写入后尚未同步给 Follower 就硬件宕机，发生不可逆脑裂或数据丢失',
      'Kafka 选主时选了落后较多的非 ISR 副本（unclean leader election）',
    ],
    solutions: [
      'Kafka 多副本配置：replication.factor >= 3 (一份数据存三份)',
      '保证最小活跃副本数：min.insync.replicas >= 2 (至少两台副本写成功)',
      '禁止不干净选主：unclean.leader.election.enable = false',
      'RocketMQ 开启同步刷盘 (flushDiskType=SYNC_FLUSH) 或双写主从',
    ],
    code: `// Kafka Broker 防丢铁三角
replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false`,
    takeaway: 'Broker 要点：宁可牺牲部分吞吐量甚至短暂不可用，也绝不丢数据。把可靠性交给多副本和硬件磁盘。',
  },
  {
    id: 'consume',
    step: '阶段 ③ 消费阶段',
    title: 'Broker → 消费者',
    desc: '从消费者拉取到消息，直到业务逻辑完全执行完毕',
    risks: [
      '消费端配置了「自动提交（auto commit）」：消息刚拉出来就向 Broker 提交 offset',
      '业务逻辑处理到一半抛出异常（如 DB 超时、空指针），或容器 OOM 崩溃',
      '由于 offset 已提前向前推进，重启后该失败消息被永久跳过！',
    ],
    solutions: [
      '彻底关闭自动提交 (enable.auto.commit = false)',
      '严格贯彻「先处理完业务，再手动提交 offset」原则',
      '处理抛异常时不提交，触发重试；多次重试失败转入死信队列 (DLQ)',
      '必须在消费端配套实现「业务幂等（唯一键/状态机）」防止重发引发二次灾难',
    ],
    code: `// 先彻底完成业务，再提交位移
while (true) {
    ConsumerRecords records = consumer.poll(1000);
    for (Record record : records) {
        processBusiness(record); // 1. 先写DB/完成业务
    }
    consumer.commitSync();       // 2. 彻底完成后再手动 commit
}`,
    takeaway: '消费端最核心原则：永远「先处理业务，后提交位移」。消息宁可重复消费（靠幂等兜底），也绝不能提前漏掉。',
  },
];

const MessageReliabilityFigure = function ({ caption = '' }) {
  const [currentId, setCurrentId] = useState('produce');
  const stage = STAGES.find((s) => s.id === currentId) || STAGES[0];

  return (
    <div className={styles.mrf}>
      <div className={styles['mrf-header']}>
        <div className={styles['mrf-title']}>
          <span>消息不丢失 · 三阶段全链路防线</span>
          <span className={styles['mrf-badge']}>高频考点沙盘</span>
        </div>
        <div style={{ fontSize: '12px', opacity: 0.75 }}>
          点击下方 3 个阶段，切换查看风险与保底方案
        </div>
      </div>

      <div className={styles['pipeline-nav']}>
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cx('nav-card', currentId === s.id && 'active')}
            onClick={() => setCurrentId(s.id)}
          >
            <span className={styles['nav-tag']}>{s.step}</span>
            <span className={styles['nav-name']}>{s.title}</span>
          </button>
        ))}
      </div>

      <div className={styles['stage-detail']}>
        <div style={{ fontWeight: 600, fontSize: '13px', opacity: 0.85 }}>
          📌 阶段聚焦：{stage.desc}
        </div>

        <div className={styles['detail-row']}>
          {/* Danger Box */}
          <div className={styles['box-danger']}>
            <div className={cx('box-title', 'danger-title')}>
              <span>⚠️ 哪里会丢消息？（风险根因）</span>
            </div>
            <ul className={styles['point-list']}>
              {stage.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Secure Box */}
          <div className={styles['box-secure']}>
            <div className={cx('box-title', 'secure-title')}>
              <span>🛡️ 工业级保底方案（解题法宝）</span>
            </div>
            <ul className={styles['point-list']}>
              {stage.solutions.map((sol) => (
                <li key={sol}>{sol}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mrf-accent)' }}>
            💻 生产核心配置 / 标准范式：
          </div>
          <pre className={styles['code-box']}>{stage.code}</pre>
        </div>
      </div>

      <div className={styles['mrf-footer']}>
        <div>
          <strong>🎯 面试金句总结：</strong> {stage.takeaway}
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

MessageReliabilityFigure.propTypes = {
  caption: PropTypes.string,
};

export default MessageReliabilityFigure;
