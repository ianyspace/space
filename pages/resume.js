import React from 'react';

import SEO from 'components/SEO';
import Header from 'components/Layout/Header';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';

import styles from './resume.module.scss';

/**
 * Standalone A4 resume page (`/resume/`), replacing the former resume article.
 * No blog chrome: just a slim toolbar and the paper itself, so the print output
 * (`@page` rules in the stylesheet) is a clean single-column A4 document.
 *
 * Personal details are masked with asterisks on purpose — this page is public.
 */
const ResumePage = function () {
    const title = formatMessage('tResume');
    const { homeLink } = useLang();

    const download = () => {
        window.print();
    };

    return (
        <div className={styles.page}>
            <SEO title={title} />

            <div className={styles.toolbar}>
                <Header base={homeLink} />
                <div className={styles['toolbar-actions']}>
                    <span className={styles['toolbar-hint']}>在打印窗口选择「另存为 PDF」即可下载</span>
                    <button type="button" className={styles['toolbar-btn']} onClick={download}>
                        ⬇ 下载 PDF
                    </button>
                </div>
            </div>

            <article className={styles.sheet}>
                <header className={styles['sheet-head']}>
                    <h1 className={styles.name}>寇**</h1>
                    <div className={styles.meta}>
                        <span>电话：199****8657</span>
                        <span className={styles.divider}>|</span>
                        <span>邮箱：anys****@qq.com</span>
                    </div>
                    <div className={styles.meta}>
                        <span>生日：1999-**</span>
                        <span className={styles.divider}>|</span>
                        <span>性别：男</span>
                    </div>
                    <div className={styles.meta}>求职意向：前端开发</div>
                </header>

                <section className={styles.section}>
                    <h2 className={styles['section-title']}>教育经历</h2>
                    <div className={styles.row}>
                        <span className={styles.strong}>中**大学</span>
                        <span>2018年09月 - 2022年06月</span>
                    </div>
                    <div className={styles.row}>
                        <span>软件工程（计算机学院）</span>
                        <span>郑州</span>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles['section-title']}>技能特长</h2>
                    <ul className={styles.bullets}>
                        <li>熟练掌握 HTML、CSS、JavaScript，掌握 ES6 新语法特性，了解 TypeScript。</li>
                        <li>熟练掌握 React.js、React-Router，熟悉其基本原理，熟悉函数式编程；熟悉 mobx、zustand 的使用。</li>
                        <li>熟悉 Vue.js，了解其基本原理；熟悉 Vue-Router、Vuex 的使用。</li>
                        <li>熟悉 Webpack、Babel，了解 Vite；熟悉前端工程化、项目打包部署优化等。</li>
                        <li>熟练掌握 antd、element-ui、echarts 等库和 Less 预处理器，熟悉 Git 版本管理工具。</li>
                        <li>熟悉 HTTP 计算机网络、数据结构等计算机基础知识。</li>
                        <li>良好英语读写能力，英语 CET4。能够对接需求、设计实现方案、协调开发并独立构建前端项目。</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2 className={styles['section-title']}>工作和项目经历</h2>
                    <div className={styles.row}>
                        <span className={styles.strong}>西安**数据</span>
                        <span>2021年11月 - 2022年05月</span>
                    </div>
                    <div className={styles.row}>
                        <span>前端开发</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.strong}>知识图谱</span>
                        <span>2021年11月 - 2022年05月</span>
                    </div>
                    <ul className={styles.bullets}>
                        <li>
                            <span className={styles.strong}>项目介绍：</span>
                            （占位示例）此处填写项目背景与业务价值，说明项目要解决什么问题、服务哪些用户、
                            使用了什么核心技术栈，两到三行即可。
                        </li>
                        <li>
                            <span className={styles.strong}>主要工作：</span>
                            <ul className={styles['sub-bullets']}>
                                <li>（占位示例）负责XX模块的开发，采用XX方案解决了XX问题，性能/体验提升XX%。</li>
                                <li>（占位示例）负责XX模块的开发，采用XX方案解决了XX问题，性能/体验提升XX%。</li>
                                <li>（占位示例）负责XX模块的开发，采用XX方案解决了XX问题，性能/体验提升XX%。</li>
                            </ul>
                        </li>
                    </ul>
                </section>
            </article>
        </div>
    );
};

export default ResumePage;
