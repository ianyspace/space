import React from 'react';
import PropTypes from 'prop-types';

import styles from './MessageReliabilityFigure.module.scss';

/**
 * 消息不丢失 · 三阶段全链路防线。
 *
 * 一条消息从生产者到消费者要经过三段路：① 发送、② 存储、③ 消费。
 * 每一段都可能丢，所以图里把每段都拆成四层说清楚：
 *   正常链路（这段本该发生什么）→ 会丢在哪（哪些情况会丢）→ 怎么防（对应防线）→ 关键配置。
 * 底部再给一句「一句话记住」，让新人也能顺着链路读完就懂。
 *
 * 早先这里是「点阶段切换」的交互沙盘，把风险/方案/代码全塞进同一块，
 * 既和正文重复又要点着看；改成静态详解后无需操作即可纵览全链路。
 */
const STAGES = [
  {
    no: '①',
    step: '发送阶段',
    route: '生产者 → Broker',
    flow: '生产者把消息发给 Broker，Broker 写进日志后回一个确认（ACK），收到 ACK 才算「发成功」。',
    risks: [
      '网络抖动 / 超时：消息丢在路上，生产者却以为发完了',
      'Broker 收到但先宕机：还没落盘就重启，内存里的消息一起没了',
    ],
    guards: [
      '必须等 Broker 明确 ACK，没等到就重试，不能发完就走',
      '重试要开幂等，否则「重发」会变成「重复消息」',
    ],
    config: ['acks=all', 'retries=3', 'enable.idempotence=true'],
    note: 'RocketMQ：同步发送 + 失败重试；事务消息先发 Half Message，回调本地事务后再提交 / 回滚。',
    key: '发出 ≠ 发成功，收到 ACK 才算数',
  },
  {
    no: '②',
    step: '存储阶段',
    route: 'Broker 落盘 + 多副本',
    flow: '消息写进 Leader 的日志，再同步到 Follower 副本，磁盘上存了多份才真正安全。',
    risks: [
      '只写内存没刷盘：宕机重启后，还没落盘的消息直接丢',
      'Leader 挂了但 Follower 没同步完：这份数据只剩一份',
      '脏选主：落后的副本当上 Leader，旧数据把新数据覆盖掉',
    ],
    guards: [
      '多副本 + 同步刷盘，让每条消息至少存在两份以上',
      '禁止落后太多的副本竞选 Leader，宁可短暂不可用也不丢数据',
    ],
    config: ['replication.factor≥3', 'min.insync.replicas≥2', 'unclean.leader.election=false'],
    note: 'RabbitMQ：持久化 + 镜像队列 / Quorum 队列；RocketMQ：同步刷盘 + 主从同步复制。',
    key: '一份不够，落盘 + 多副本才安全',
  },
  {
    no: '③',
    step: '消费阶段',
    route: 'Broker → 消费者',
    flow: '消费者拉取消息，处理完业务后再提交位移（offset），Broker 才知道「这条已经消费过了」。',
    risks: [
      '先提交 offset 再处理业务：业务失败时消息已被标记「消费过」，再也拉不到',
      '异步处理还没跑完就提交：线程挂了，这条消息同样丢',
    ],
    guards: [
      '先做业务，全部成功后再手动提交位移',
      '处理失败就不提交，交给重试 / 死信队列兜底',
    ],
    config: ['关闭自动提交', '业务成功后再 commit', '失败进死信队列'],
    note: '消费端要做幂等：「至少一次」投递下，重试必然带来重复消息。',
    key: '处理完再提交，顺序反了就会丢',
  },
];

const MessageReliabilityFigure = function ({ caption = '' }) {
  return (
    <div className={styles.mrf}>
      <div className={styles['mrf-flow']}>
        <span className={styles['mrf-node']}>生产者</span>
        <span className={styles['mrf-link']}>
          <em>①</em> 发送
        </span>
        <span className={styles['mrf-node']}>Broker</span>
        <span className={styles['mrf-link']}>
          <em>②</em> 存储
        </span>
        <span className={styles['mrf-node']}>磁盘 · 副本</span>
        <span className={styles['mrf-link']}>
          <em>③</em> 消费
        </span>
        <span className={styles['mrf-node']}>消费者</span>
      </div>

      <div className={styles['mrf-list']}>
        {STAGES.map((stage) => (
          <div key={stage.step} className={styles['mrf-row']}>
            <div className={styles['mrf-head']}>
              <div className={styles['mrf-head-top']}>
                <span className={styles['mrf-no']}>{stage.no}</span>
                <div className={styles['mrf-head-text']}>
                  <div className={styles['mrf-step']}>{stage.step}</div>
                  <div className={styles['mrf-route']}>{stage.route}</div>
                </div>
              </div>
              <div className={styles['mrf-key']}>{stage.key}</div>
            </div>

            <div className={styles['mrf-body']}>
              <div className={styles['mrf-flowline']}>
                <span className={styles['mrf-tag']}>正常链路</span>
                <p className={styles['mrf-text']}>{stage.flow}</p>
              </div>

              <div className={`${styles['mrf-block']} ${styles['mrf-block--risk']}`}>
                <span className={styles['mrf-tag']}>会丢在哪</span>
                <ul className={styles['mrf-ul']}>
                  {stage.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={`${styles['mrf-block']} ${styles['mrf-block--guard']}`}>
                <span className={styles['mrf-tag']}>怎么防</span>
                <ul className={styles['mrf-ul']}>
                  {stage.guards.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles['mrf-config']}>
                <span className={styles['mrf-tag']}>关键配置</span>
                <div className={styles['mrf-chips']}>
                  {stage.config.map((item) => (
                    <code key={item} className={styles['mrf-chip']}>
                      {item}
                    </code>
                  ))}
                </div>
              </div>

              <div className={styles['mrf-note']}>{stage.note}</div>
            </div>
          </div>
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
