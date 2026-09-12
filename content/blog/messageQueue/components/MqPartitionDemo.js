import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Mq.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * Partitions, consumer groups and rebalancing.
 *
 * The two things this widget wants the reader to *feel*:
 *
 *   1. the same key always lands on the same partition, and a partition is
 *      consumed by exactly one member of the group → 分区内有序;
 *   2. more consumers than partitions is wasted, and any membership change
 *      triggers a rebalance that moves whole partitions around.
 */

const KEYS = ['A', 'B', 'C', 'D', 'E'];
const CONSUMER_COLORS = ['#4f6ef7', '#8b5cf6', '#2f9e68', '#cf8a1c', '#d9534f'];

const hashKey = (key) => key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

const MqPartitionDemo = function ({ partitions = '3', consumers: consumerProp = '2', caption = '' }) {
  const initialCount = Math.min(4, Math.max(1, Number(partitions) || 3));
  const initialConsumers = Math.min(4, Math.max(1, Number(consumerProp) || 2));

  const [partitionCount, setPartitionCount] = useState(initialCount);
  const [queues, setQueues] = useState(() => Array.from({ length: initialCount }, () => []));
  const [members, setMembers] = useState(() =>
    Array.from({ length: initialConsumers }, (_, i) => `C${i + 1}`),
  );
  const [seq, setSeq] = useState(1);
  const [rebalanced, setRebalanced] = useState(false);

  const consumerIds = useMemo(() => [...members].sort(), [members]);

  const assignment = useMemo(
    () => Array.from({ length: partitionCount }, (_, index) => consumerIds[index % consumerIds.length]),
    [partitionCount, consumerIds],
  );

  const load = useMemo(() => {
    const counts = {};
    consumerIds.forEach((id) => {
      counts[id] = 0;
    });
    assignment.forEach((id) => {
      counts[id] += 1;
    });
    return counts;
  }, [assignment, consumerIds]);

  const flagRebalance = () => {
    setRebalanced(true);
    setTimeout(() => setRebalanced(false), 1400);
  };

  const changePartitions = (next) => {
    setPartitionCount(next);
    setQueues(Array.from({ length: next }, () => []));
    setSeq(1);
    flagRebalance();
  };

  const send = (key) => {
    const index = hashKey(key) % partitionCount;
    setQueues((current) =>
      current.map((queue, i) => (i === index ? [...queue, { id: seq, key }] : queue)),
    );
    setSeq(seq + 1);
  };

  const changeMembers = (delta) => {
    if (delta > 0) {
      setMembers([...members, `C${members.length + 1}`]);
    } else if (members.length > 1) {
      setMembers(members.slice(0, -1));
    }
    flagRebalance();
  };

  const killFirst = () => {
    if (members.length <= 1) return;
    setMembers(members.slice(1));
    flagRebalance();
  };

  const total = queues.reduce((sum, queue) => sum + queue.length, 0);
  const busiest = queues.reduce((max, queue) => Math.max(max, queue.length), 0);
  const idle = members.length - Math.min(members.length, partitionCount);

  return (
    <div className={styles.mq}>
      <div className={styles['mq-head']}>
        <span className={styles['mq-badge']}>动态图解</span>
        <span className={styles['mq-caption']}>{caption || '分区 · 消费组 · 重平衡'}</span>
        <span className={styles['mq-hint']}>Topic: order-topic</span>
      </div>

      <div className={styles['mq-bar']}>
        <span className={styles['mq-label']}>发送消息</span>
        {['A', 'B', 'C', 'D'].map((key) => (
          <button key={key} type="button" className={styles['mq-btn']} onClick={() => send(key)}>
            key = {key}
          </button>
        ))}
        <button
          type="button"
          className={styles['mq-btn']}
          onClick={() => send(KEYS[Math.floor(Math.random() * KEYS.length)])}
        >
          随机 key
        </button>
      </div>

      <div className={styles['mq-bar']}>
        <span className={styles['mq-label']}>消费组 G1</span>
        <button type="button" className={styles['mq-btn']} onClick={() => changeMembers(1)}>
          + 消费者
        </button>
        <button
          type="button"
          className={styles['mq-btn']}
          onClick={() => changeMembers(-1)}
          disabled={members.length <= 1}
        >
          − 消费者
        </button>
        <button
          type="button"
          className={styles['mq-btn']}
          onClick={killFirst}
          disabled={members.length <= 1}
        >
          💥 {consumerIds[0]} 宕机
        </button>
        <span className={styles['mq-label']}>分区数</span>
        <select
          className={styles['mq-select']}
          value={partitionCount}
          onChange={(event) => changePartitions(Number(event.target.value))}
        >
          {[1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>
              {value} 个分区
            </option>
          ))}
        </select>
      </div>

      <div className={styles['mq-parts']}>
        {queues.map((queue, index) => {
          const owner = assignment[index];
          const color = CONSUMER_COLORS[consumerIds.indexOf(owner) % CONSUMER_COLORS.length];
          return (
            <div className={styles['mq-part']} key={index}>
              <div className={styles['mq-part-head']}>
                <span>Partition {index}</span>
                <span className={styles['mq-consumer']} style={{ background: color }}>
                  {owner}
                </span>
              </div>
              <div className={styles['mq-part-body']}>
                {queue.length ? (
                  queue.map((message) => (
                    <span
                      className={styles['mq-msg']}
                      key={message.id}
                      title={`第 ${message.id} 条消息，key = ${message.key}`}
                    >
                      {message.key}#{message.id}
                    </span>
                  ))
                ) : (
                  <span className={styles['mq-idle']}>空</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles['mq-stats']}>
        <div className={styles['mq-stat']}>
          <span className={styles['mq-stat-k']}>消息总数</span>
          <span className={styles['mq-stat-v']}>{total}</span>
        </div>
        {consumerIds.map((id, index) => (
          <div className={styles['mq-stat']} key={id}>
            <span className={styles['mq-stat-k']}>{id} 负责的分区</span>
            <span className={styles['mq-stat-v']} style={{ color: CONSUMER_COLORS[index % CONSUMER_COLORS.length] }}>
              {load[id] || 0}
            </span>
          </div>
        ))}
        <div className={styles['mq-stat']}>
          <span className={styles['mq-stat-k']}>最忙的分区</span>
          <span className={styles['mq-stat-v']}>{busiest} 条</span>
        </div>
      </div>

      {idle > 0 ? (
        <div className={cx('mq-note', 'mq-note-warn')}>
          有 {idle} 个消费者分不到分区，正闲着：<strong>并行度的上限是分区数</strong>，
          消费者再多也没用。想提高消费能力，得先扩分区。
        </div>
      ) : null}

      {rebalanced ? (
        <div className={cx('mq-note', 'mq-note-bad')}>
          <strong>触发重平衡（Rebalance）</strong>：成员或分区数一变，整组重新分配分区。
          期间消费会短暂停止——这也是「消费者扩容反而抖动」的原因。
        </div>
      ) : null}

      <div className={styles['mq-note']}>
        同一个 key 永远落到同一个分区（这里用 <code>key 的字符和 % 分区数</code> 演示），
        而一个分区在同一消费组内只由一个消费者负责，所以 <strong>同 key 的消息天然有序</strong>。
        注意：改分区数会改变这个映射关系，扩容分区并不保证顺序不被打乱。
      </div>
    </div>
  );
};

MqPartitionDemo.propTypes = {
  /** Initial partition count, 1–4. */
  partitions: PropTypes.string,
  /** Initial consumer count in the group, 1–4. */
  consumers: PropTypes.string,
  /** Shown next to the "动态图解" badge. */
  caption: PropTypes.string,
};

export default MqPartitionDemo;
