import React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';

import { site } from 'config';
import { useLang } from 'context/LanguageContext';

/**
 * SEO component, ported from the original Gatsby `react-helmet` implementation.
 */
const SEO = function ({ description = '', meta = [], keywords = [], title }) {
    const { lang } = useLang();

    const metaDescription = description || site.description;

    const metaTags = [
        { name: 'description', content: metaDescription },
        { property: 'og:title', content: title },
        { property: 'og:description', content: metaDescription },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:creator', content: site.author },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: metaDescription },
    ];

    if (keywords.length > 0) {
        metaTags.push({ name: 'keywords', content: keywords.join(', ') });
    }

    const currentLang = lang || site.lang;

    React.useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = currentLang;
        }
    }, [currentLang]);

    return (
        <Head>
            <title>{`${title} | ${site.title}`}</title>
            {metaTags.concat(meta).map((tag) => {
                const attributes = { ...tag };
                const key = attributes.name || attributes.property;
                return <meta key={key} {...attributes} />;
            })}
        </Head>
    );
};

SEO.propTypes = {
    description: PropTypes.string,
    meta: PropTypes.arrayOf(PropTypes.object),
    keywords: PropTypes.arrayOf(PropTypes.string),
    title: PropTypes.string.isRequired,
};

export default SEO;
