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

import articleComponents from 'lib/generated/articleComponents';
import sharedComponents from 'content/components';
import withBasePath from 'utils/basePath';
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
        const catalogsContain = document.querySelector('.css-toc');
        const anchorsContain = document.querySelector('#main-contain');
        if (!catalogsContain || !anchorsContain) return undefined;

        const catalogs = catalogsContain.getElementsByTagName('a');
        const handler = setCatalog(anchors, catalogs, anchorsContain);
        return () => anchorsContain.removeEventListener('scroll', handler);
    }, [update, mdxSource]);

    let tags;
    if (frontmatter.tags) {
        tags = <TagList tags={frontmatter.tags} baseUrl={`${homeLink}tags`} />;
    }

    // Covers from frontmatter may be local (`/blog/<dir>/cover.svg`) and then
    // need the deployment base path; remote covers are returned unchanged.
    const coverSrc = withBasePath(frontmatter.cover);
    // Only remote hosts expose the `th` thumbnail variant, so a local cover uses
    // the same file for the low resolution layer — deriving `cover.th.svg` would
    // only produce a 404 for an image nobody ever sees (it sits under the full
    // size one). Same rule as `components/PostAbbrev`.
    let lowCover = coverSrc;
    if (/^https?:\/\//i.test(frontmatter.cover)) {
        const arr = frontmatter.cover.split('.');
        arr.splice(arr.length - 1, 0, 'th');
        lowCover = withBasePath(arr.join('.'));
    }

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

                <span
                    style={{ marginLeft: '20px', color: 'var(--tag-bg)' }}
                    id="leancloud-visitors"
                    className="leancloud_visitors"
                    data-flag-title={post.slug}
                >
                    <span>{`${formatMessage('tRead')} : `}</span>
                    <span className="leancloud-visitors-count">•••</span>
                </span>
            </p>

            {tags}

            <TranslationsLink
                translationsLink={translationsLink}
                langKey={lang}
                style={{ margin: '-0.5rem 0 1.5rem' }}
            />

            {frontmatter.cover && (
                <div
                    style={{
                        width: '100%',
                        height: '280px',
                        position: 'relative',
                    }}
                >
                    <img
                        src={lowCover}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt=""
                    />
                    <img
                        src={coverSrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            top: '0px',
                            left: '0px',
                        }}
                        alt=""
                    />
                </div>
            )}

            {showUnreal && (
                <Private
                    cover={frontmatter.cover}
                    question={frontmatter.question}
                    answer={frontmatter.password}
                    updateParent={updateParent}
                />
            )}

            <div className="css-post">
                {showUnreal ? (
                    '小机灵鬼，这是私密内容，老实回答正确问题才可以查看内容哦O(∩_∩)O'
                ) : (
                    <MDXRemote {...mdxSource} components={mdxComponents} />
                )}
            </div>
            <div
                className="css-toc"
                dangerouslySetInnerHTML={{ __html: showUnreal ? '' : tableOfContents }}
            />

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
