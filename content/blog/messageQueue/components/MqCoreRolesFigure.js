import React from 'react';
import PropTypes from 'prop-types';

import styles from './MqCoreRolesFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * 消息队列三大核心作用图解：解耦、削峰、异步。
 *
 * 一张静态图说清三件事，每张卡片给出「形态 + 一句话本质 + 适用场景」，
 * 不依赖交互即可读懂。
 */
const MqCoreRolesFigure = function ({ caption = '' }) {
  return (
    <div className={styles.mqcr}>
      <div className={styles['mqcr-grid']}>
        {/* 1. 解耦 */}
        <div className={cx('mqcr-card', 'mqcr-decouple')}>
          <div className={styles['mqcr-head']}>
            <span className={styles['mqcr-num']}>1</span>
            <span className={styles['mqcr-name']}>解耦</span>
          </div>
          <p className={styles['mqcr-tagline']}>上游只发消息，下游各自订阅</p>

          <div className={styles['mqcr-flow']}>
            <div className={cx('mqcr-node', 'mqcr-node-a')}>
              <span className={styles['mqcr-node-icon']}>🚀</span>
              <span>订单服务 A</span>
            </div>
            <div className={styles['mqcr-vlink']}>
              <span className={styles['mqcr-vline']} />
              <span className={styles['mqcr-vtext']}>发消息</span>
            </div>
            <div className={cx('mqcr-node', 'mqcr-node-mq')}>MQ</div>
            <div className={styles['mqcr-vlink']}>
              <span className={styles['mqcr-vline']} />
              <span className={styles['mqcr-vtext']}>订阅</span>
            </div>
            <div className={styles['mqcr-subs']}>
              <span className={cx('mqcr-sub', 'mqcr-sub-1')}>库存 B</span>
              <span className={cx('mqcr-sub', 'mqcr-sub-2')}>积分 C</span>
              <span className={cx('mqcr-sub', 'mqcr-sub-3')}>日志 D</span>
            </div>
          </div>

          <p className={styles['mqcr-note']}>
            <strong>新增系统 E？</strong>订阅 MQ 即可，A 零改动。
          </p>
        </div>

        {/* 2. 削峰 */}
        <div className={cx('mqcr-card', 'mqcr-peak')}>
          <div className={styles['mqcr-head']}>
            <span className={styles['mqcr-num']}>2</span>
            <span className={styles['mqcr-name']}>削峰</span>
          </div>
          <p className={styles['mqcr-tagline']}>峰值先入队，下游按能力消费</p>

          <div className={styles['mqcr-chart']}>
            <div className={styles['mqcr-bars']}>
              <span className={styles['mqcr-bar']} style={{ height: '24%' }} />
              <span className={styles['mqcr-bar']} style={{ height: '46%' }} />
              <span className={cx('mqcr-bar', 'mqcr-bar-peak')} style={{ height: '100%' }} />
              <span className={styles['mqcr-bar']} style={{ height: '72%' }} />
              <span className={styles['mqcr-bar']} style={{ height: '34%' }} />
            </div>
            <div className={styles['mqcr-flat']}>
              <span className={styles['mqcr-flat-line']} />
              <span className={styles['mqcr-flat-label']}>下游消费能力</span>
            </div>
          </div>

          <p className={styles['mqcr-note']}>
            <strong>秒杀几万下单</strong>先缓冲，数据库不被冲垮。
          </p>
        </div>

        {/* 3. 异步 */}
        <div className={cx('mqcr-card', 'mqcr-async')}>
          <div className={styles['mqcr-head']}>
            <span className={styles['mqcr-num']}>3</span>
            <span className={styles['mqcr-name']}>异步</span>
          </div>
          <p className={styles['mqcr-tagline']}>主流程先返回，后续的事后台干</p>

          <div className={styles['mqcr-timeline']}>
            <div className={styles['mqcr-lane']}>
              <span className={styles['mqcr-lane-label']}>同步</span>
              <div className={styles['mqcr-lane-track']}>
                <span className={styles['mqcr-seg']}>注册</span>
                <span className={styles['mqcr-seg']}>短信</span>
                <span className={styles['mqcr-seg']}>积分</span>
                <span className={styles['mqcr-seg']}>日志</span>
              </div>
              <span className={cx('mqcr-cost', 'mqcr-cost-slow')}>500ms</span>
            </div>
            <div className={styles['mqcr-lane']}>
              <span className={styles['mqcr-lane-label']}>异步</span>
              <div className={styles['mqcr-lane-track']}>
                <span className={cx('mqcr-seg', 'mqcr-seg-core')}>注册</span>
                <span className={cx('mqcr-seg', 'mqcr-seg-mq')}>发 MQ</span>
                <span className={cx('mqcr-seg', 'mqcr-seg-bg')}>短信 · 积分 · 日志</span>
              </div>
              <span className={cx('mqcr-cost', 'mqcr-cost-fast')}>20ms</span>
            </div>
          </div>

          <p className={styles['mqcr-note']}>
            <strong>注册成功立即返回</strong>，副作用异步执行。
          </p>
        </div>
      </div>

      <div className={styles['mqcr-summary']}>
        一句话记住：<strong>解耦</strong>让系统各管各、<strong>削峰</strong>让数据库不被打垮、
        <strong>异步</strong>让接口响应更快。
      </div>

      {caption && <div className={styles['mqcr-caption']}>{caption}</div>}
    </div>
  );
};

MqCoreRolesFigure.propTypes = {
  caption: PropTypes.string,
};

export default MqCoreRolesFigure;
