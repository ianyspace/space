import antiShake from './antiShake';

/**
 * Scroll-spy for the article TOC: on scroll, the first heading currently
 * visible in the viewport gets the `is-active` class on its matching TOC link
 * (styled in `styles/catalog.scss`); all other links are cleared.
 */
const setCatalog = (anchors, catalogs, anchorsContain) => {
    const anchorsContainScroll = () => {
        let highlightIndex = -1;
        for (let index = 0; index < anchors.length; index += 1) {
            const { bottom } = anchors[index].getBoundingClientRect();
            if (bottom <= window.innerHeight && bottom >= 0) {
                highlightIndex = index;
                break;
            }
        }
        [...catalogs].forEach((item, index) => {
            item.classList.toggle('is-active', index === highlightIndex);
        });
    };

    const antiShakeAnchorsContainScroll = antiShake(anchorsContainScroll, 10);
    // Set both the rail and the modal copy immediately. Without this, the
    // modal opened after the first scroll would not show the current section
    // until the reader moved again.
    anchorsContainScroll();
    anchorsContain.addEventListener('scroll', antiShakeAnchorsContainScroll);
    return antiShakeAnchorsContainScroll;
};

export default setCatalog;
