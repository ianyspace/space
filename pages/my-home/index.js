import React from 'react';

import SEO from 'components/SEO';
import MyHomeScene from 'components/MyHome/MyHomeScene';

/**
 * `/my-home/` — a 3D walkthrough of the apartment, built from the floor plan
 * in `components/MyHome/plan.js`.
 *
 * Deliberately outside `Layout`: the model is the page, so it gets the whole
 * viewport instead of the article column. The 3D bundle (three.js) is imported
 * inside the component, so it is only fetched when someone opens this route.
 */
const MyHomePage = function () {
    return (
        <>
            <SEO
                title="My Home"
                description="一套三室两厅的 3D 户型漫游，法式简洁风格：可以旋转、俯视，也可以走进去。"
                keywords={['3D 户型', '法式简洁', '室内设计', 'Three.js']}
            />
            <MyHomeScene />
        </>
    );
};

export default MyHomePage;
