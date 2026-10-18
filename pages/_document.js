import React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';

import { site } from 'config';
import themeOper from 'utils/themeOper';
import tocOper from 'utils/tocOper';
import withBasePath from 'utils/basePath';

/**
 * Custom document, replacing the Gatsby `src/html.js`.
 * Bootstraps the dark/light theme and the folded article outline before paint
 * (both would otherwise flash on load), and loads the `LXGW WenKai Screen`
 * webfont used across the site.
 */
export default class MyDocument extends Document {
    render() {
        return (
            <Html lang={site.lang}>
                <Head>
                    <meta name="baidu-site-verification" content="codeva-1hikzyFV3T" />
                    <meta charSet="utf-8" />
                    <meta httpEquiv="x-ua-compatible" content="ie=edge" />
                    <meta
                        name="google-site-verification"
                        content="WMpB6sL6Q-CDBdh81_PNJv7AoOV6jeQTDGbbXTccNBs"
                    />
                    <link rel="icon" href={withBasePath('/favicon.ico')} />
                    <link
                        rel="stylesheet"
                        href="https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css"
                    />
                </Head>
                <body className="light">
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `(${themeOper.toString()})();`,
                        }}
                    />
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `(${tocOper.toString()})();`,
                        }}
                    />
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}
