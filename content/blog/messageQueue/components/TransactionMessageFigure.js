import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './TransactionMessageFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const SCENARIOS = {
  commit: {
    name: '场景 1：正常提交（本地事务成功）',
    steps: [
      {
        title: '1. 发送 Half Message（半消息）',
        sender: '生产者 → Broker',
        desc: '生产者向 RocketMQ 发送半消息。该消息在 Broker 内部打上特殊标记，对消费者完全不可见，消费者拉不到。',
      },
      {
        title: '2. 确认半消息已持久化',
        sender: 'Broker → 生产者',
        desc: 'Broker 成功写入半消息，返回确认 ACK。生产者确认 MQ 端已留存，开始下一步。',
      },
      {
        title: '3. 执行本地数据库事务',
        sender: '生产者 本地 DB',
        desc: '生产者执行本地业务操作（例如：扣减用户余额、生成订单记录）。本地事务成功 COMMIT！',
      },
      {
        title: '4. 发送二次确认 Commit',
        sender: '生产者 → Broker',
        desc: '根据本地事务结果，生产者向 Broker 发送二阶段 Commit 指令。',
      },
      {
        title: '5. 消息对消费者可见，正常投递',
        sender: 'Broker → 下游消费者',
        desc: 'Broker 收到 Commit，将该消息恢复为正常可见状态。下游积分/优惠券服务拉取并消费，保证最终一致性！',
      },
    ],
  },
  rollback: {
    name: '场景 2：回滚（本地事务失败）',
    steps: [
      {
        title: '1. 发送 Half Message（半消息）',
        sender: '生产者 → Broker',
        desc: '生产者向 Broker 发送半消息，下游不可见。',
      },
      {
        title: '2. 确认半消息存妥',
        sender: 'Broker → 生产者',
        desc: 'Broker 返回写入成功 ACK。',
      },
      {
        title: '3. 本地数据库事务异常失败',
        sender: '生产者 本地 DB',
        desc: '生产者执行扣减余额时发现余额不足，或者数据库抛出唯一键冲突异常，本地事务回滚 (ROLLBACK)！',
      },
      {
        title: '4. 发送二次确认 Rollback',
        sender: '生产者 → Broker',
        desc: '生产者向 Broker 发送 Rollback 指令，明确告知本地事务失败。',
      },
      {
        title: '5. Broker 物理删除/废弃消息',
        sender: 'Broker 内部处理',
        desc: 'Broker 直接废弃该半消息，下游消费者永远不会收到，两端数据保持一致（都不会被处理）！',
      },
    ],
  },
  check: {
    name: '场景 3：异常断网与状态反查（Check Callback）',
    steps: [
      {
        title: '1. 发送 Half 消息并存妥',
        sender: '生产者 ↔ Broker',
        desc: '半消息发送成功，Broker 返回 ACK。',
      },
      {
        title: '2. 本地事务成功，但网络闪断/进程宕机',
        sender: '生产者事故现场',
        desc: '生产者的本地事务成功写入了 DB，但在准备发 Commit 指令时网络断开或容器 OOM 重启！Broker 始终收不到二阶段确认。',
      },
      {
        title: '3. Broker 超时发起事务反查',
        sender: 'Broker → 生产者集群',
        desc: '经过设定的超时时间后，Broker 主动调用生产者实现的 checkLocalTransaction() 回查接口！',
      },
      {
        title: '4. 生产者查询本地 DB 确认状态',
        sender: '生产者 check 方法',
        desc: '生产者查 DB（例如根据业务流水号查订单表），发现该订单确实已经成功落库。',
      },
      {
        title: '5. 补发 Commit，恢复投递',
        sender: '生产者 → Broker',
        desc: '反查方法返回 COMMIT_MESSAGE，Broker 恢复消息可见性并投递给下游！成功避免单边遗漏！',
      },
    ],
  },
};

const TransactionMessageFigure = function ({ caption = '' }) {
  const [activeScenario, setActiveScenario] = useState('commit');
  const [curStep, setCurStep] = useState(0);

  const scenario = SCENARIOS[activeScenario];
  const total = scenario.steps.length;

  const selectScenario = (key) => {
    setActiveScenario(key);
    setCurStep(0);
  };

  const nextStep = () => {
    if (curStep < total - 1) setCurStep(curStep + 1);
  };

  const prevStep = () => {
    if (curStep > 0) setCurStep(curStep - 1);
  };

  return (
    <div className={styles.tmf}>
      <div className={styles['tmf-header']}>
        <div className={styles['tmf-title']}>
          <span>RocketMQ 事务消息（Half Message）两阶段与回查流程</span>
          <span className={styles['tmf-badge']}>阿里/高并发必备</span>
        </div>
        <div style={{ fontSize: '12px', opacity: 0.75 }}>
          步进拆解分布式最终一致性核心机制
        </div>
      </div>

      <div className={styles['tmf-modes']}>
        <button
          type="button"
          className={cx('mode-btn', activeScenario === 'commit' && 'active')}
          onClick={() => selectScenario('commit')}
        >
          ✅ 正常提交链路
        </button>
        <button
          type="button"
          className={cx('mode-btn', activeScenario === 'rollback' && 'active')}
          onClick={() => selectScenario('rollback')}
        >
          ❌ 事务失败回滚
        </button>
        <button
          type="button"
          className={cx('mode-btn', activeScenario === 'check' && 'active')}
          onClick={() => selectScenario('check')}
        >
          🔄 掉线超时反查机制 (核心加分项)
        </button>
      </div>

      <div className={styles['step-viewer']}>
        <button
          type="button"
          className={styles['btn-step']}
          onClick={prevStep}
          disabled={curStep === 0}
        >
          ← 上一步
        </button>
        <button
          type="button"
          className={styles['btn-step']}
          onClick={nextStep}
          disabled={curStep === total - 1}
        >
          下一步 →
        </button>
        <button
          type="button"
          className={styles['btn-step']}
          style={{ background: 'transparent', borderColor: 'var(--tmf-panel-border)', color: 'var(--tmf-text)' }}
          onClick={() => setCurStep(0)}
        >
          重新演示
        </button>
        <span className={styles['step-indicator']}>
          当前进度：第 {curStep + 1} / {total} 步
        </span>
      </div>

      <div className={styles['flow-box']}>
        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--tmf-accent)' }}>
          {scenario.name}
        </div>

        <div className={styles.timeline}>
          {scenario.steps.map((st, idx) => {
            const isCur = idx === curStep;
            const isDone = idx < curStep;
            return (
              <div
                key={idx}
                className={cx(
                  'timeline-step',
                  isCur && 'current',
                  isDone && 'done'
                )}
                onClick={() => setCurStep(idx)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles['step-num']}>{idx + 1}</div>
                <div className={styles['step-content']}>
                  <div className={styles['step-title']}>
                    <span>{st.title}</span>
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{st.sender}</span>
                  </div>
                  <div className={styles['step-desc']}>{st.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles['tmf-explain']}>
        <div><strong>💡 为什么普通 MQ 无法做到本地事务与发消息的原子性？</strong></div>
        <div style={{ marginTop: '4px', opacity: 0.85 }}>
          先操作 DB 再发 MQ：发 MQ 遇网络异常，DB 已提交，下游漏单！<br />
          先发 MQ 再操作 DB：DB 遇锁等待抛异常回滚，消息已送出，下游平白加了积分！<br />
          <strong>RocketMQ 半消息精妙之处：</strong> 先发 Half 消息占位并验证 Broker 通信；本地事务完成后再 Commit；中间无论谁宕机断网，都有 Broker 定时回查机制兜底对齐，完美保障分布式最终一致性！
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

TransactionMessageFigure.propTypes = {
  caption: PropTypes.string,
};

export default TransactionMessageFigure;
