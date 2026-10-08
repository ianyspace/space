import React from 'react';
import PropTypes from 'prop-types';

import styles from './ConsumerGroupFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * 消息分发模型对比：点对点 / 发布订阅 / 现代集群消费组。
 *
 * 三张卡片并排、同一套版式，横向一眼就能比出「一条消息到底发给了谁」：
 *  1. 点对点（Queue）：一条消息只被一个消费者取走；
 *  2. 发布订阅（Topic）：每个订阅者都收到全量；
 *  3. 现代集群（Topic + 分区 + 消费组）：组内分流、组间广播。
 *
 * 早先这里是「切模式 + 发消息 + 统计」的交互沙盘，信息量太大反而看不清对比，
 * 改成静态并排后无需操作即可读懂。
 */
const ConsumerGroupFigure = function ({ caption = '' }) {
  return (
    <div className={styles.msgm}>
      <div className={styles['msgm-grid']}>
        {/* 1. 点对点 */}
        <div className={cx('msgm-card', 'msgm-p2p')}>
          <div className={styles['msgm-head']}>
            <span className={styles['msgm-num']}>1</span>
            <span className={styles['msgm-name']}>点对点 Queue</span>
          </div>
          <p className={styles['msgm-tagline']}>一条消息只被一个消费者取走</p>

          <div className={styles['msgm-flow']}>
            <div className={cx('msgm-node', 'msgm-producer')}>生产者</div>
            <span className={styles['msgm-arrow']}>↓</span>
            <div className={cx('msgm-node', 'msgm-broker')}>Queue</div>
            <span className={styles['msgm-arrow']}>↓</span>
            <div className={styles['msgm-row']}>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>Worker 1</span>
              <span className={styles['msgm-chip']}>Worker 2</span>
              <span className={styles['msgm-chip']}>Worker 3</span>
            </div>
          </div>

          <p className={styles['msgm-note']}>多 Worker 抢占任务，<strong>互不重复</strong></p>
        </div>

        {/* 2. 发布订阅 */}
        <div className={cx('msgm-card', 'msgm-pubsub')}>
          <div className={styles['msgm-head']}>
            <span className={styles['msgm-num']}>2</span>
            <span className={styles['msgm-name']}>发布订阅 Topic</span>
          </div>
          <p className={styles['msgm-tagline']}>每个订阅者都收到全量</p>

          <div className={styles['msgm-flow']}>
            <div className={cx('msgm-node', 'msgm-producer')}>生产者</div>
            <span className={styles['msgm-arrow']}>↓</span>
            <div className={cx('msgm-node', 'msgm-broker')}>Topic</div>
            <span className={styles['msgm-arrow']}>↓</span>
            <div className={styles['msgm-row']}>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>邮件</span>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>短信</span>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>积分</span>
            </div>
          </div>

          <p className={styles['msgm-note']}>一条消息<strong>广播给所有订阅者</strong></p>
        </div>

        {/* 3. 现代集群 */}
        <div className={cx('msgm-card', 'msgm-cluster')}>
          <div className={styles['msgm-head']}>
            <span className={styles['msgm-num']}>3</span>
            <span className={styles['msgm-name']}>现代集群消费组</span>
            <span className={styles['msgm-badge']}>推荐</span>
          </div>
          <p className={styles['msgm-tagline']}>Topic + 分区 + 消费组</p>

          <div className={styles['msgm-flow']}>
            <div className={cx('msgm-node', 'msgm-producer')}>生产者</div>
            <span className={styles['msgm-arrow']}>↓</span>
            <div className={styles['msgm-row']}>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>P0</span>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>P1</span>
              <span className={cx('msgm-chip', 'msgm-chip-on')}>P2</span>
            </div>
            <span className={styles['msgm-arrow']}>↓</span>
            <div className={styles['msgm-groups']}>
              <div className={styles['msgm-group']}>
                <span className={styles['msgm-group-name']}>组 A · 组内分流</span>
                <div className={styles['msgm-row']}>
                  <span className={styles['msgm-chip']}>A1</span>
                  <span className={styles['msgm-chip']}>A2</span>
                </div>
              </div>
              <div className={styles['msgm-group']}>
                <span className={styles['msgm-group-name']}>组 B · 全量</span>
                <div className={styles['msgm-row']}>
                  <span className={styles['msgm-chip']}>B1</span>
                </div>
              </div>
            </div>
          </div>

          <p className={styles['msgm-note']}>组内<strong>负载均衡</strong>，组间<strong>各订阅各的</strong></p>
        </div>
      </div>

      {caption && <div className={styles['msgm-caption']}>{caption}</div>}
    </div>
  );
};

ConsumerGroupFigure.propTypes = {
  caption: PropTypes.string,
};

export default ConsumerGroupFigure;
