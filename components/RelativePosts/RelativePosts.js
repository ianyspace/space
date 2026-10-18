import React from 'react';
import PropTypes from 'prop-types';

import { formatMessage } from 'utils/i18n';
import RelativePost from '../RelativePost';

const RelativePosts = function ({ postNodes = [] }) {
    const tRelativePosts = formatMessage('tRelativePosts');
    const postNodesNotNull = postNodes.filter((x) => x);

    if (postNodesNotNull.length === 0) {
        return null;
    }

    return (
        <>
            <hr />
            <div style={{ marginTop: '-1rem' }}>{tRelativePosts}:</div>
            {postNodesNotNull.map((post) => (
                <RelativePost key={post.slug} post={post} />
            ))}
        </>
    );
};

RelativePosts.propTypes = {
    postNodes: PropTypes.array,
};

export default RelativePosts;
