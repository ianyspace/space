import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: the five runtime data areas, split by who owns them.
 *
 * The split that matters is not "which area does what" — that is a table — but
 * *which areas die with the thread and which die with the JVM*. Drawing the two
 * groups as two panels with their lifetimes in the header makes that visible in
 * one glance, and it is the thing the interview question is actually about.
 *
 * The two panels share every vertical coordinate, so the eye reads across them
 * instead of down each one.
 */
const PANELS = [
    {
        key: 'private',
        x: 16,
        color: 'var(--my-accent)',
        title: '线程私有',
        life: '随线程创建 / 销毁',
        boxes: [
            {
                y: 46,
                height: 82,
                name: '程序计数器（PC Register）',
                lines: [
                    '当前线程正在执行的字节码指令地址',
                    '执行 native 方法时为空',
                    '唯一不会 OOM 的区域',
                ],
            },
            {
                y: 130,
                height: 82,
                name: '虚拟机栈（JVM Stack）',
                lines: [
                    '每个方法一个栈帧：局部变量表 / 操作数栈',
                    '动态链接 / 方法返回地址',
                    '栈深度超限 → StackOverflowError',
                ],
            },
            {
                y: 214,
                height: 82,
                name: '本地方法栈（Native Stack）',
                lines: ['服务 native 方法（JNI）', 'HotSpot 里与虚拟机栈合并实现'],
            },
        ],
    },
    {
        key: 'shared',
        x: 412,
        color: 'var(--my-db)',
        title: '线程共享',
        life: '随 JVM 创建 / 销毁',
        boxes: [
            {
                y: 46,
                height: 100,
                name: '堆（Heap）',
                lines: [
                    '所有对象实例和数组 · GC 的主战场',
                    '新生代：Eden + Survivor 0/1，约 1/3',
                    '老年代：长期存活的对象，约 2/3',
                ],
            },
            {
                y: 156,
                height: 140,
                name: '方法区（Method Area）',
                lines: [
                    '类的完整信息 · 运行时常量池 · JIT 代码缓存',
                    'JDK 7 及以前：永久代（PermGen），在堆内',
                    'JDK 8+：元空间（Metaspace），在本地内存',
                    '注意：方法区是规范，永久代 / 元空间是 HotSpot 的实现',
                ],
            },
        ],
    },
];

const MemoryFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '运行时数据区：三块跟着线程走，两块跟着 JVM 走'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 330"
                    role="img"
                    aria-label="JVM 运行时数据区：线程私有的程序计数器、虚拟机栈、本地方法栈，线程共享的堆和方法区"
                >
                    {PANELS.map((panel) => (
                        <g key={panel.key}>
                            <rect
                                x={panel.x}
                                y="14"
                                width="352"
                                height="286"
                                rx="12"
                                fill="none"
                                stroke={panel.color}
                                strokeWidth="1.6"
                                strokeDasharray="6 4"
                            />
                            <text
                                x={panel.x + 14}
                                y="34"
                                fontSize="12.5"
                                fontWeight="700"
                                fill={panel.color}
                            >
                                {panel.title}
                            </text>
                            <text
                                x={panel.x + 338}
                                y="34"
                                textAnchor="end"
                                fontSize="10"
                                fill="var(--my-muted)"
                            >
                                {panel.life}
                            </text>

                            {panel.boxes.map((box) => (
                                <g key={box.name}>
                                    <rect
                                        x={panel.x + 12}
                                        y={box.y}
                                        width="328"
                                        height={box.height}
                                        rx="9"
                                        fill="var(--my-card)"
                                        stroke="var(--my-line)"
                                        strokeWidth="1.2"
                                    />
                                    <text
                                        x={panel.x + 24}
                                        y={box.y + 22}
                                        fontSize="12.5"
                                        fontWeight="700"
                                        fill="var(--my-text)"
                                    >
                                        {box.name}
                                    </text>
                                    {box.lines.map((line, i) => (
                                        <text
                                            key={line}
                                            x={panel.x + 24}
                                            y={box.y + 42 + i * 16}
                                            fontSize="10"
                                            fill="var(--my-muted)"
                                        >
                                            {line}
                                        </text>
                                    ))}
                                </g>
                            ))}
                        </g>
                    ))}

                    <text x="16" y="320" fontSize="10.5" fill="var(--my-muted)">
                        线程一结束，私有那三块跟着消失；堆和方法区要等 JVM 退出 ——
                        所以线程没了，它 new 出来的对象还在，得靠 GC 收。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

MemoryFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default MemoryFigure;
