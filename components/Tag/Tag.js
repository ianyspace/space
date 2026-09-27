import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';

const Tag = function ({ url, text, count = null, ...restProps }) {
    return (
        <span className="round-tag" {...restProps}>
            <Link className="link" href={url}>
                <span className="text">
                    {text}
                    {count != null && ` (${count})`}
                </span>
            </Link>
        </span>
    );
};

Tag.propTypes = {
    url: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    count: PropTypes.number,
};

export default Tag;
