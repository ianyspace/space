import React from 'react';
import PropTypes from 'prop-types';

import Link from 'next/link';

import withBasePath from 'utils/basePath';
import { formatReadingTime } from 'utils/helpers';
import { formatDate } from 'utils/i18n';

import TagList from '../TagList';

import styles from './PostAbbrev.module.scss';

/**
 * Cover used by articles that define no `cover` in their frontmatter (the resume
 * is deliberately one of them). It ships with the site instead of pointing at a
 * remote image host: the previous default lived on `img.picgo.net`, which now
 * answers 404, so those articles showed a broken image in the list.
 */
const DEFAULT_COVER = withBasePath('/blog/default-cover.svg');

/** Builds the low resolution variant of a cover by inserting `th` before the extension. */
function toLowCover(cover) {
    const arr = cover.split('.');
    arr.splice(arr.length - 1, 0, 'th');
    return arr.join('.');
}

const PostAbbrev = function ({
    slug,
    title = null,
    date,
    timeToRead,
    excerpt = null,
    tags = null,
    base = '',
    cover = '',
}) {
    let excerptPart;
    if (excerpt) {
        excerptPart = <p>{excerpt}</p>;
    }

    let tagsPart;
    if (tags) {
        tagsPart = (
            <TagList style={{ margin: '0.5rem 0 0 0' }} tags={tags} baseUrl={`${base}tags`} />
        );
    }

    // Covers from frontmatter may be local (`/blog/<dir>/cover.svg`) and then
    // need the deployment base path; remote covers are returned unchanged.
    const normalizedCover = withBasePath(cover);
    const highCover = normalizedCover || DEFAULT_COVER;
    // Only remote hosts expose the `th` thumbnail variant, so local covers reuse
    // their single file as the low resolution layer instead of 404ing on
    // `cover.th.svg`.
    const lowCover = /^https?:\/\//i.test(cover) ? withBasePath(toLowCover(cover)) : highCover;

    return (
        <div className={styles.article} style={{ background: 'var(--bg-article)' }}>
            <div className={styles['article-doc']}>
                <div className={styles.title}>
                    <Link style={{ boxShadow: 'none' }} href={slug} rel="bookmark">
                        {title}
                    </Link>
                </div>
                <div className="other">{tagsPart}</div>
                <div className={styles.desc}>{excerptPart}</div>

                <div className={styles['article-bottom']}>
                    <div className="read-time">{formatReadingTime(timeToRead)}</div>
                    <div className="time">{`${formatDate(date)}`}</div>
                </div>
            </div>
            <div className={styles['img-contain']}>
                <Link style={{ boxShadow: 'none' }} href={slug} rel="bookmark">
                    <img loading="lazy" decoding="async" src={lowCover} alt="" />
                    <img
                        loading="lazy"
                        decoding="async"
                        style={{ position: 'absolute', top: '0px', left: '0px' }}
                        src={highCover}
                        alt=""
                    />
                </Link>
            </div>
        </div>
    );
};

PostAbbrev.propTypes = {
    slug: PropTypes.string.isRequired,
    title: PropTypes.string,
    date: PropTypes.string.isRequired,
    timeToRead: PropTypes.number.isRequired,
    excerpt: PropTypes.string,
    tags: PropTypes.array,
    base: PropTypes.string,
    cover: PropTypes.string,
};

export default PostAbbrev;
