import React from 'react';

import SEO from 'components/SEO';
import Header from 'components/Layout/Header';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';

import styles from './resume.module.scss';

/**
 * Standalone A4 resume page (`/resume/`).
 *
 * The resume is static content, so the page layout is *declared* in PAGES below
 * rather than measured at runtime: one entry = one A4 paper on screen = one
 * printed page (`break-after: page`). Declaring it keeps the render identical on
 * the server and the client, at any window width, with no flicker — an earlier
 * version measured block heights in useEffect and packed them greedily, which
 * was timing-dependent and sometimes fell back to a single endless sheet.
 *
 * When editing the content, keep the split in sync: a block belongs to exactly
 * one page. Rough budget per page is 1019px of content (A4 1123px minus the
 * sheet's 52px top/bottom padding) — one page of this resume is ~1000px tall,
 * so a sensible split is "header + education + skills + first job" then the rest.
 *
 * Personal details are masked with asterisks on purpose — this page is public.
 */

const BLOCKS = {
    education: {
        title: '教育经历',
        content: (
            <>
                <div className={styles.row}>
                    <span className={styles.strong}>中**大学</span>
                    <span>2018年09月 - 2022年06月</span>
                </div>
                <div className={styles.row}>
                    <span>软件工程（计算机学院）</span>
                    <span>郑州</span>
                </div>
            </>
        ),
    },
    skills: {
        title: '技能特长',
        content: (
            <ul className={styles.bullets}>
                <li>
                    熟练掌握 React 18 与 TypeScript，熟悉 Hooks 与状态管理（Redux Toolkit、zustand），
                    具备中后台与 C 端项目从 0 到 1 的完整交付经验。
                </li>
                <li>
                    熟悉 Next.js 服务端渲染与 Vite 构建体系，掌握首屏性能治理（代码分割、虚拟滚动、缓存策略），
                    能通过埋点与监控定位并解决性能瓶颈。
                </li>
                <li>
                    熟练掌握 Java 与 Spring Boot / Spring Cloud、MyBatis，能独立完成接口设计、库表建模与业务模块开发；
                    熟悉 MySQL 索引与慢查询优化、Redis 缓存与分布式锁、Kafka 消息解耦。
                </li>
                <li>
                    熟悉 Docker、Nginx 与 CI/CD 流水线，具备服务部署、灰度发布与线上问题排查
                    （日志、监控、链路追踪）能力。
                </li>
                <li>
                    熟练使用 Ant Design、ECharts、Three.js 等生态库，具备公共组件库沉淀与数据可视化开发经验；
                    了解 React Native、小程序等跨端方案。
                </li>
                <li>熟悉 HTTP 计算机网络、数据结构等计算机基础知识，熟悉 Git 协作与代码评审规范。</li>
                <li>
                    良好英语读写能力，CET4；能独立承接需求评审、方案设计、前后端开发与上线验收的完整闭环，
                    并指导新人熟悉工程规范与业务架构。
                </li>
            </ul>
        ),
    },
    'job-current': {
        title: '工作和项目经历',
        content: (
            <>
                <div className={styles.row}>
                    <span className={styles.strong}>某**科技</span>
                    <span>2024年03月 - 至今</span>
                </div>
                <div className={styles.row}>
                    <span>全栈开发工程师</span>
                </div>
                <div className={styles.row}>
                    <span className={styles.strong}>运营中台平台</span>
                    <span>2024年03月 - 至今</span>
                </div>
                <ul className={styles.bullets}>
                    <li>
                        <span className={styles.strong}>项目介绍：</span>
                        面向内部 20+ 业务方的一体化运营平台，覆盖活动配置、数据看板与工单流转。
                        前端 React + TypeScript，后端 Java + Spring Boot，支撑日均 3000 万请求、峰值 QPS 8000。
                    </li>
                    <li>
                        <span className={styles.strong}>主要工作：</span>
                        <ul className={styles['sub-bullets']}>
                            <li>
                                主导前端从遗留 jQuery 架构迁移至 React + TypeScript，沉淀 30+ 公共组件与配置化表单引擎，
                                被 3 个团队复用，同类需求交付周期缩短 60%。
                            </li>
                            <li>
                                重构核心查询链路（执行计划优化 + 多级缓存 + 异步化），接口 P95 从 900ms 降至 150ms，
                                数据库 CPU 峰值下降 45%。
                            </li>
                            <li>
                                引入消息队列解耦工单流转与通知链路，主流程响应提升 35%，下游故障不再影响核心业务。
                            </li>
                            <li>
                                搭建前端性能与错误监控，首屏 LCP 从 4.1s 优化至 1.3s，白屏类线上问题从月均 8 起降至 0。
                            </li>
                        </ul>
                    </li>
                </ul>
            </>
        ),
    },
    'job-previous': {
        title: null,
        content: (
            <>
                <div className={styles.row}>
                    <span className={styles.strong}>某**网络</span>
                    <span>2022年07月 - 2024年02月</span>
                </div>
                <div className={styles.row}>
                    <span>全栈开发工程师</span>
                </div>
                <div className={styles.row}>
                    <span className={styles.strong}>企业级 SaaS 平台</span>
                    <span>2022年07月 - 2024年02月</span>
                </div>
                <ul className={styles.bullets}>
                    <li>
                        <span className={styles.strong}>项目介绍：</span>
                        面向 B 端客户的一体化业务管理平台，覆盖订单、客户与权限三大模块，服务 200+ 企业客户，
                        日订单峰值 30 万。
                    </li>
                    <li>
                        <span className={styles.strong}>主要工作：</span>
                        <ul className={styles['sub-bullets']}>
                            <li>
                                负责订单模块全栈开发，设计幂等与状态机方案解决重复提交与对账差异，
                                对账差错从每周 15+ 条降至接近零。
                            </li>
                            <li>
                                搭建多租户权限与数据隔离方案，支撑客户自定义角色与字段，成为产品付费转化的关键能力。
                            </li>
                            <li>完成大促容量评估与压测，配合限流兜底与扩容预案，峰值期间零故障。</li>
                            <li>
                                输出模块级单元测试与接口文档，回归测试人力投入减少 50%；指导 1 名新人独立完成模块交付。
                            </li>
                        </ul>
                    </li>
                </ul>
            </>
        ),
    },
};

// 一页 = 一组块的 key。改内容后按注释里的高度预算调整这里。
const PAGES = [['education', 'skills', 'job-current'], ['job-previous']];

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
                    <span className={styles['toolbar-hint']}>
                        共 {PAGES.length} 页（打印时每页一张 A4）· 在打印窗口选择「另存为 PDF」即可下载
                    </span>
                    <button type="button" className={styles['toolbar-btn']} onClick={download}>
                        ⬇ 下载 PDF
                    </button>
                </div>
            </div>

            <div className={styles.stack}>
                {PAGES.map((keys, index) => (
                    <article className={styles.sheet} key={`sheet-${index}`}>
                        {index === 0 && (
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
                                <div className={styles.meta}>求职意向：全栈开发</div>
                            </header>
                        )}

                        {keys.map((key) => {
                            const block = BLOCKS[key];
                            if (!block) return null;

                            return (
                                <section className={styles.block} key={key}>
                                    {block.title && <h2 className={styles['section-title']}>{block.title}</h2>}
                                    {block.content}
                                </section>
                            );
                        })}
                    </article>
                ))}
            </div>
        </div>
    );
};

export default ResumePage;
