import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: the four class loaders and the up-then-down path of one
 * `loadClass()` call.
 *
 * The whole point of the delegation model is the *direction* — the request goes
 * up, and only the failure comes back down. Two arrows per gap (dashed up,
 * solid down) say that in a way that prose keeps re-explaining.
 *
 * The right column is the same thing in code order, so the picture and the
 * three `loadClass` steps can be read against each other.
 */
const LOADERS = [
    {
        y: 20,
        name: 'Bootstrap ClassLoader（启动类加载器）',
        range: '加载 <JAVA_HOME>/lib（rt.jar 等）· 由 C++ 实现',
    },
    {
        y: 88,
        name: 'Platform ClassLoader（平台类加载器）',
        range: 'JDK 9+ 取代 Extension，加载平台模块',
    },
    {
        y: 156,
        name: 'App ClassLoader（应用类加载器）',
        range: '加载 classpath 下的类 · 我们自己写的类都在这儿',
    },
    {
        y: 224,
        name: '自定义 ClassLoader',
        range: '重写 findClass()，比如 Tomcat 的 WebappClassLoader',
    },
];

const STEPS = [
    { index: '①', text: '已加载过 → 直接返回', code: 'findLoadedClass(name)' },
    { index: '②', text: '没加载过 → 交给父加载器', code: 'parent.loadClass(name, false)' },
    { index: '③', text: '父加载器都失败 → 才自己找', code: 'findClass(name)' },
];

const GAPS = [68, 136, 204];

const LoaderFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '双亲委派：请求一路向上，只有「找不到」才掉头向下'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 290"
                    role="img"
                    aria-label="双亲委派模型：Bootstrap、Platform、App、自定义四个类加载器，以及一次 loadClass 先向上委派、失败后自己加载的过程"
                >
                    <defs>
                        <marker
                            id="loader-up"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-accent)" />
                        </marker>
                        <marker
                            id="loader-down"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-db)" />
                        </marker>
                    </defs>

                    {LOADERS.map((loader) => (
                        <g key={loader.name}>
                            <rect
                                x="44"
                                y={loader.y}
                                width="350"
                                height="48"
                                rx="9"
                                fill="var(--my-card)"
                                stroke="var(--my-line)"
                                strokeWidth="1.2"
                            />
                            <text
                                x="58"
                                y={loader.y + 21}
                                fontSize="12"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {loader.name}
                            </text>
                            <text x="58" y={loader.y + 38} fontSize="10" fill="var(--my-muted)">
                                {loader.range}
                            </text>
                        </g>
                    ))}

                    {GAPS.map((gap, i) => (
                        <g key={gap}>
                            {/* 向上委派：虚线，箭头朝上 */}
                            <line
                                x1="80"
                                y1={gap + 18}
                                x2="80"
                                y2={gap + 2}
                                stroke="var(--my-accent)"
                                strokeWidth="1.6"
                                strokeDasharray="4 3"
                                markerEnd="url(#loader-up)"
                            />
                            {/* 回退加载：实线，箭头朝下 */}
                            <line
                                x1="358"
                                y1={gap + 2}
                                x2="358"
                                y2={gap + 18}
                                stroke="var(--my-db)"
                                strokeWidth="1.6"
                                markerEnd="url(#loader-down)"
                            />
                            {i === 0 ? (
                                <>
                                    <text x="92" y={gap + 15} fontSize="9" fill="var(--my-accent)">
                                        ① 先向上委派
                                    </text>
                                    <text
                                        x="346"
                                        y={gap + 15}
                                        textAnchor="end"
                                        fontSize="9"
                                        fill="var(--my-db)"
                                    >
                                        ② 都不行才自己加载
                                    </text>
                                </>
                            ) : null}
                        </g>
                    ))}

                    {/* 右列：loadClass() 的三步 */}
                    <text x="424" y="34" fontSize="12" fontWeight="700" fill="var(--my-text)">
                        loadClass() 的三步
                    </text>
                    {STEPS.map((step, i) => (
                        <g key={step.text}>
                            <rect
                                x="424"
                                y={46 + i * 58}
                                width="340"
                                height="48"
                                rx="9"
                                fill="var(--my-card)"
                                stroke="var(--my-line)"
                                strokeWidth="1.2"
                            />
                            <text
                                x="438"
                                y={69 + i * 58}
                                fontSize="12"
                                fontWeight="700"
                                fill="var(--my-accent)"
                            >
                                {step.index}
                            </text>
                            <text
                                x="460"
                                y={69 + i * 58}
                                fontSize="11.5"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {step.text}
                            </text>
                            <text
                                x="460"
                                y={86 + i * 58}
                                fontSize="10"
                                fill="var(--my-muted)"
                                fontFamily="var(--monospaceFont, monospace)"
                            >
                                {step.code}
                            </text>
                        </g>
                    ))}

                    <text x="424" y="238" fontSize="10" fill="var(--my-muted)">
                        关键：父子之间是「先问再加载」，不是「谁先找到算谁」。
                    </text>
                    <text x="424" y="256" fontSize="10" fill="var(--my-muted)">
                        所以 java.lang.String 永远由 Bootstrap 加载，你自己写一个
                    </text>
                    <text x="424" y="274" fontSize="10" fill="var(--my-muted)">
                        同名的放进 classpath 也顶替不掉 —— 这就是它防篡改的原理。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

LoaderFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default LoaderFigure;
