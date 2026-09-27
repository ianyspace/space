import React from 'react';
import PropTypes from 'prop-types';

import Link from 'next/link';

import { rhythm } from 'utils/typography';
import { formatReadingTime } from 'utils/helpers';
import { formatDate } from 'utils/i18n';

import TagList from '../TagList';

import styles from './PostAbbrev.module.scss';

const PostAbbrevSimple = function ({
    slug,
    title = null,
    date,
    timeToRead,
    excerpt = null,
    tags = null,
    base = '',
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

    return (
        <article className={styles['simple-article']}>
            <header>
                <h3
                    style={{
                        fontSize: rhythm(1),
                        marginBottom: rhythm(1 / 4),
                    }}
                >
                    <Link style={{ boxShadow: 'none' }} href={slug} rel="bookmark">
                        {title}
                    </Link>
                </h3>
                {tagsPart}
                <small>{`${formatDate(date)} • ${formatReadingTime(timeToRead)}`}</small>
                {excerptPart}
            </header>
        </article>
    );
};

PostAbbrevSimple.propTypes = {
    slug: PropTypes.string.isRequired,
    title: PropTypes.string,
    date: PropTypes.string.isRequired,
    timeToRead: PropTypes.number.isRequired,
    excerpt: PropTypes.string,
    tags: PropTypes.array,
    base: PropTypes.string,
};

export default PostAbbrevSimple;
