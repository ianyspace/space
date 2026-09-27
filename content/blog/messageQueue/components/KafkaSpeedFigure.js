import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './KafkaSpeedFigure.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const KafkaSpeedFigure = function ({ caption = '' }) {
  const [activeTab, setActiveTab] = useState('zerocopy'); // 'zerocopy' | 'seqio'

  return (
    <div className={styles.ksf}>
      <div className={styles['ksf-header']}>
        <div className={styles['ksf-title']}>
          <span>Kafka 性能核武器对比图解</span>
          <span className={styles['ksf-badge']}>底层原理解析</span>
        </div>
        <div style={{ fontSize: '12px', opacity: 0.75 }}>
          探究单机百万 TPS 背后的操作系统级优化
        </div>
      </div>

      <div className={styles['ksf-tabs']}>
        <button
          type="button"
          className={cx('tab-btn', activeTab === 'zerocopy' && 'active')}
          onClick={() => setActiveTab('zerocopy')}
        >
          🚀 零拷贝技术（sendfile 对比传统 I/O）
        </button>
        <button
          type="button"
          className={cx('tab-btn', activeTab === 'seqio' && 'active')}
          onClick={() => setActiveTab('seqio')}
        >
          ⚡ 顺序写与 PageCache
        </button>
      </div>

      {activeTab === 'zerocopy' && (
        <div className={styles['compare-grid']}>
          {/* Traditional I/O */}
          <div className={styles['card-half']}>
            <div className={styles['card-title']}>
              <span>传统网络发送 (4 次拷贝 + 4 次切换)</span>
              <span className={cx('stats-pill', 'pill-bad')}>低效</span>
            </div>
            <div className={styles['flow-stack']}>
              <div className={styles['flow-node']}>
                <span>1. 磁盘（Hard Disk）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>物理存储</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-dma')}>↓ DMA 拷贝 (1) [切换: 用户态→内核态]</div>
              <div className={styles['flow-node']}>
                <span>2. 内核缓冲区（Page Cache）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>内核态</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-cpu')}>↓ CPU 拷贝 (2) [切换: 内核态→用户态]</div>
              <div className={styles['flow-node']}>
                <span>3. JVM 用户内存（Application Buffer）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>用户态</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-cpu')}>↓ CPU 拷贝 (3) [切换: 用户态→内核态]</div>
              <div className={styles['flow-node']}>
                <span>4. Socket 缓冲区（Socket Buffer）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>内核态</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-dma')}>↓ DMA 拷贝 (4) [切换: 内核态→用户态]</div>
              <div className={styles['flow-node']}>
                <span>5. 网卡芯片（NIC Buffer）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>发送到网络</span>
              </div>
            </div>
          </div>

          {/* Zero Copy */}
          <div className={styles['card-half']}>
            <div className={styles['card-title']}>
              <span>Kafka 零拷贝 (2 次 DMA + 2 次切换)</span>
              <span className={cx('stats-pill', 'pill-good')}>零 CPU 介入</span>
            </div>
            <div className={styles['flow-stack']}>
              <div className={styles['flow-node']}>
                <span>1. 磁盘（Hard Disk）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>物理存储</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-dma')}>↓ DMA 拷贝 (1) [切换: 用户态→内核态]</div>
              <div className={styles['flow-node']} style={{ borderColor: 'var(--ksf-accent)' }}>
                <span>2. 内核缓冲区（Page Cache）</span>
                <span style={{ color: 'var(--ksf-accent)', fontWeight: 600 }}>读写核心</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-dma')}>
                ↓ <strong>sendfile() 系统调用：直通网卡！</strong> (仅传递描述符)
              </div>
              <div className={styles['flow-node']} style={{ opacity: 0.45, textDecoration: 'line-through' }}>
                <span>[完全跳过 JVM 用户空间与 Socket 内存]</span>
              </div>
              <div className={cx('flow-arrow', 'arrow-dma')}>↓ DMA 拷贝 (2) [切换: 内核态→用户态]</div>
              <div className={styles['flow-node']}>
                <span>3. 网卡芯片（NIC Buffer）</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>线速发送</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seqio' && (
        <div className={styles['compare-grid']}>
          <div className={styles['card-half']}>
            <div className={styles['card-title']}>
              <span>普通数据库 / 随机写 I/O</span>
              <span className={cx('stats-pill', 'pill-bad')}>受寻道时间限制</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div>• 传统关系数据库在磁盘各处随机寻找空闲数据页（寻道开销大）。</div>
              <div>• 机械磁盘随机写速度通常只有 <strong>100KB/s ~几 MB/s</strong>。</div>
              <div>• 产生大量随机寻道和旋转延迟，I/O 成为最主要的性能瓶颈。</div>
            </div>
          </div>

          <div className={styles['card-half']}>
            <div className={styles['card-title']}>
              <span>Kafka 顺序写（Append-Only）</span>
              <span className={cx('stats-pill', 'pill-good')}>速度比肩内存</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div>• 消息永远<strong>只追加（Append）在日志文件末尾</strong>，指针单向向前。</div>
              <div>• 机械硬盘的顺序读写可轻松冲到 <strong>600MB/s</strong>，逼近内存速度！</div>
              <div>• 配合 <strong>Page Cache</strong>：直接在 OS 内存中完成读写，落盘完全由操作系统异步批量刷盘。</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles['ksf-explain']}>
        <div><strong>💡 考官核心评分点：</strong></div>
        <div style={{ marginTop: '4px', opacity: 0.85 }}>
          {activeTab === 'zerocopy'
            ? '所谓的「零拷贝」，指的是“没有 CPU 拷贝”，整个数据传输完全由 DMA（直接内存访问）硬件完成，CPU 只负责发号施令，而且数据永远不经过 JVM 用户内存空间，极大节省了 CPU 周期并消除 GC 压力！'
            : 'Kafka 巧妙地利用了操作系统的 Page Cache 和顺序 I/O：写消息其实就是写 OS 内存页，读消息如果刚好命中缓存也是直接从内存走，因此 Kafka 并不需要自己管理巨大的 JVM 内存堆，既避免了冗长的 Java GC 停顿，又实现了极致的吞吐！'}
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

KafkaSpeedFigure.propTypes = {
  caption: PropTypes.string,
};

export default KafkaSpeedFigure;
