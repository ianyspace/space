/**
 * Site wide configuration. Mirrors the original Gatsby project's `config/index.js`.
 */
const site = {
    // The site is published to GitHub Pages as a *project* page, ie.
    // https://ianyspace.github.io/space/, so every route and asset has to live
    // under `/space`. This value is used both as Next's `basePath` (see
    // `next.config.js`) and to strip the prefix again when resolving the current
    // language from `router.asPath`.
    pathPrefix: '/space',
    title: 'anyspace',
    author: 'Kou ShiXiang',
    description: '一个记录知识和生活的神秘小空间',
    // The site is published to GitHub Pages as a project page. It moved from the
    // old `iCpplus` account to `ianyspace`. (Before that it was served from
    // `https://anyspace.cc` by Vercel; that deploy target has been dropped
    // because a domain root and a `/space/` project path cannot share the same
    // `basePath`.)
    siteUrl: 'https://ianyspace.github.io/space/',
    disqusShortName: 'anyspace',
    googleTrackingId: 'G-E7NM1ZBB2T',
    lang: 'zh-hans',
    displayTranslations: true,
    postsPerPage: 5,
};

const supportedLanguages = {
    en: 'English',
    'zh-hans': '简体中文',
};

module.exports = {
    site,
    supportedLanguages,
};
