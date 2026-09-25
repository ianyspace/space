import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote';

import Bio from 'components/Bio';
import Layout from 'components/Layout';
import SEO from 'components/SEO';
import TagList from 'components/TagList';
import RelativePosts from 'components/RelativePosts';
import TranslationsLink from 'components/TranslationsLink';
import Private from 'components/Private';
import Love from 'components/Love';
import Comments from 'components/Comments';
import ArticleToc from 'components/ArticleToc/ArticleToc';

import articleComponents from 'lib/generated/articleComponents';
import sharedComponents from 'content/components';
import { formatReadingTime } from 'utils/helpers';
import { formatDate, formatMessage } from 'utils/i18n';
import { rhythm, scale } from 'utils/typography';
import setCatalog from 'utils/setCatalog';
import { useLang } from 'context/LanguageContext';

/**
 * Components available to *every* article live in `content/components/`.
 *
 * Nothing is registered here by hand: article specific components live next to
 * their MDX in `content/blog/<dir>/components/` and are merged in below from the
 * generated registry (see `scripts/gen-article-registry.js`).
 *
 * The MDX pipeline parses raw HTML, so a tag written in the body is looked up in
 * the resulting map and rendered as the matching React component.
 */

const BlogPostTemplate = function ({
    post,
    mdxSource,
    tableOfContents = '',
    previous = null,
    next = null,
    previousInSameTag = null,
    nextInSameTag = null,
    translationsLink = [],
}) {
    const { frontmatter } = post;
    // Shared components plus the ones shipped by this article's own folder.
    const mdxComponents = { ...sharedComponents, ...(articleComponents[post.dirName] || {}) };
    const siteTitle = formatMessage('title');
    const { lang, homeLink } = useLang();

    const [language, setLanguage] = useState('zh-CN');
    const [placeholder, setPlaceholder] = useState('');
    const [mySession, setMySession] = useState();
    const [update, setUpdate] = useState('');

    const updateParent = () => {
        setUpdate(`${new Date().getTime()}`);
    };

    useEffect(() => {
        const flag = window.location.href.split('/').includes('en');
        const u = flag ? 'en' : 'zh-CN';
        const p = flag
            ? `
    Please kindly comment`
            : `
    • 请大家友善评论,遵纪守法。爱国、敬业、诚信、友善
    • 昵称输入qq账号,将自动引用qq相关头像昵称邮箱
    • 评论支持md格式输入`;
        setLanguage(u);
        setPlaceholder(p);
    }, []);

    useEffect(() => {
        setMySession(window.sessionStorage);
    }, []);

    useEffect(() => {
        const anchors = document.querySelectorAll('.anchor');
        const anchorsContain = document.querySelector('#main-contain');
        const catalogsContain = document.querySelectorAll('.css-toc, .css-toc-modal');
        if (!catalogsContain.length || !anchorsContain) return undefined;

        const handlers = [...catalogsContain].map((catalog) =>
            setCatalog(anchors, catalog.getElementsByTagName('a'), anchorsContain),
        );
        return () => handlers.forEach((handler) => anchorsContain.removeEventListener('scroll', handler));
    }, [update, mdxSource]);

    /**
     * 表格的「还能往右滑」提示。滚动条是隐藏的，不提示的话窄屏上表格右半截就像被凭空
     * 切掉了。结构由 `lib/mdx.js` 的 rehypeWrapTables 生成：.table-wrap > .table-scroll > table
     * —— 检测挂在内层（会滚的那个），class 打在外层（挂提示的那个）。
     */
    useEffect(() => {
        const scrollers = document.querySelectorAll('.css-post .table-scroll');
        if (!scrollers.length) return undefined;

        const cleanups = [...scrollers].map((scroller) => {
            const wrap = scroller.closest('.table-wrap');
            if (!wrap) return () => {};

            const sync = () => {
                const max = scroller.scrollWidth - scroller.clientWidth;
                wrap.classList.toggle('is-scrollable', max > 2);
                wrap.classList.toggle('at-end', scroller.scrollLeft >= max - 2);
            };

            sync();
            scroller.addEventListener('scroll', sync, { passive: true });
            window.addEventListener('resize', sync);

            return () => {
                scroller.removeEventListener('scroll', sync);
                window.removeEventListener('resize', sync);
            };
        });

        return () => cleanups.forEach((fn) => fn());
    }, [update, mdxSource]);

    let tags;
    if (frontmatter.tags) {
        tags = <TagList tags={frontmatter.tags} baseUrl={`${homeLink}tags`} />;
    }

    // 文章详情页不再展示封面横幅：`frontmatter.cover` 只在私密文章未解锁时给
    // `Private` 当锁屏背景用（`components/Private/Private.js` 自己处理 base path）。

    const showUnreal =
        frontmatter.private && mySession?.getItem('password') !== frontmatter.password;

    const tagsList = frontmatter.tags || [];
    const showLove = tagsList.includes('爱情') || tagsList.includes('love');

    return (
        <Layout title={siteTitle} breadcrumbs={[{ text: frontmatter.title }]}>
            <SEO title={frontmatter.title} description={frontmatter.description || post.excerpt} />
            <Love show={showLove} />

            <h1>{frontmatter.title}</h1>
            <p
                style={{
                    ...scale(-1 / 5),
                    display: 'block',
                    marginBottom: rhythm(1),
                    marginTop: rhythm(-1),
                }}
            >
                {formatDate(frontmatter.date)}
                {` • ${formatReadingTime(post.timeToRead)}`}
            </p>

            {tags}

            <TranslationsLink
                translationsLink={translationsLink}
                langKey={lang}
                style={{ margin: '-0.5rem 0 1.5rem' }}
            />

            {showUnreal && (
                <Private
                    cover={frontmatter.cover}
                    question={frontmatter.question}
                    answer={frontmatter.password}
                    updateParent={updateParent}
                />
            )}

            {/* 详情页不再放封面横幅，标题区（日期 / 标签）和正文之间少了一层 280px 的
                间隔，这里补一个正文上间距，免得正文直接顶到标签上。相邻 margin 会
                collapse，所以有翻译链接的文章不会被叠成双倍。 */}
            <div className="css-post" style={{ marginTop: rhythm(1) }}>
                {showUnreal ? (
                    '小机灵鬼，这是私密内容，老实回答正确问题才可以查看内容哦O(∩_∩)O'
                ) : (
                    <MDXRemote {...mdxSource} components={mdxComponents} />
                )}
            </div>
            {!showUnreal && <ArticleToc tableOfContents={tableOfContents} />}

            {frontmatter.relative && (
                <RelativePosts postNodes={[previousInSameTag, nextInSameTag]} />
            )}

            <hr
                style={{
                    marginBottom: rhythm(1),
                }}
            />
            <Bio />

            <ul
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    listStyle: 'none',
                    padding: 0,
                    marginLeft: 0,
                }}
            >
                <li>
                    {previous && (
                        <Link href={previous.slug} rel="prev">
                            ← {previous.title}
                        </Link>
                    )}
                </li>
                <li>
                    {next && (
                        <Link href={next.slug} rel="next">
                            {next.title} →
                        </Link>
                    )}
                </li>
            </ul>

            {frontmatter.disqus && (
                <Comments
                    lang={language}
                    placeholder={placeholder}
                    pageSize={5}
                    path={post.slug}
                />
            )}
        </Layout>
    );
};

BlogPostTemplate.propTypes = {
    post: PropTypes.object.isRequired,
    mdxSource: PropTypes.object.isRequired,
    tableOfContents: PropTypes.string,
    previous: PropTypes.object,
    next: PropTypes.object,
    previousInSameTag: PropTypes.object,
    nextInSameTag: PropTypes.object,
    translationsLink: PropTypes.array,
};

export default BlogPostTemplate;
