import React from 'react';
import PropTypes from 'prop-types';

import styles from './MessageReliabilityFigure.module.scss';

/**
 * 消息不丢失 · 三阶段全链路防线。
 *
 * 一屏看完「生产者 → Broker → 消费者」这条链路上，每一段会丢在哪、怎么防：
 * ① 发送阶段、② 存储阶段、③ 消费阶段。每段给出「风险 + 防线 + 关键配置」三行，
 * 详情留给正文，图只做全链路总览。
 *
 * 早先这里是「点阶段切换」的交互沙盘，把风险/方案/代码全塞进同一块，
 * 既和正文重复又要点着看，改成静态流水线后无需操作即可纵览全链路。
 */
const STAGES = [
  {
    step: '① 发送阶段',
    title: '生产者 → Broker',
    risk: '网络抖动 / Broker 未确认，消息没送达',
    guard: '等 Broker 明确 ACK；失败立即重试',
    config: 'acks=all · retries=3 · 幂等',
  },
  {
    step: '② 存储阶段',
    title: 'Broker 持久化',
    risk: '未刷盘就宕机 / 副本还没同步',
    guard: '多副本 + 同步刷盘，禁止脏选主',
    config: '副本≥3 · min.insync≥2 · 同步刷盘',
  },
  {
    step: '③ 消费阶段',
    title: 'Broker → 消费者',
    risk: '还没处理完就先提交了 offset',
    guard: '先处理业务，再手动提交位移',
    config: '关自动提交 · 处理完再 commit',
  },
];

const MessageReliabilityFigure = function ({ caption = '' }) {
  return (
    <div className={styles.mrf}>
      <div className={styles['mrf-pipe']}>
        {STAGES.map((stage, index) => (
          <React.Fragment key={stage.step}>
            {index > 0 && (
              <div className={styles['mrf-arrow']} aria-hidden="true">→</div>
            )}
            <div className={styles['mrf-card']}>
              <div className={styles['mrf-step']}>{stage.step}</div>
              <div className={styles['mrf-title']}>{stage.title}</div>

              <div className={styles['mrf-risk']}>
                <span className={styles['mrf-label']}>会丢在哪</span>
                <p className={styles['mrf-text']}>{stage.risk}</p>
              </div>

              <div className={styles['mrf-guard']}>
                <span className={styles['mrf-label']}>怎么防</span>
                <p className={styles['mrf-text']}>{stage.guard}</p>
              </div>

              <div className={styles['mrf-config']}>{stage.config}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {caption && <div className={styles['mrf-caption']}>{caption}</div>}
    </div>
  );
};

MessageReliabilityFigure.propTypes = {
  caption: PropTypes.string,
};

export default MessageReliabilityFigure;
