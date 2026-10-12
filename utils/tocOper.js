/**
 * Outline-fold bootstrap, inlined into `_document` so it runs before the first
 * paint.
 *
 * The server cannot know about `localStorage`, so the rail always arrives
 * unfolded; React can only fold it once the page has hydrated. Without this
 * script a reader who folded the outline away sees it flash open on every
 * refresh. Here we write the choice onto <html> while the document is still
 * parsing, and `ArticleToc.module.scss` keys the folded state off that class.
 *
 * Keep the class name and the storage key in sync with
 * `components/ArticleToc/ArticleToc.js`.
 */
export default function tocOper() {
    try {
        if (window.localStorage.getItem('tocCollapsed') === '1') {
            document.documentElement.classList.add('toc-collapsed');
        }
    } catch (err) {
        // Storage unavailable (private mode): keep the outline open.
    }
}
