import React from 'react';
import Head from 'next/head';
import Script from 'next/script';

import { LanguageProvider } from 'context/LanguageContext';
import withBasePath from 'utils/basePath';
import { getLive2DEnabled } from 'utils/live2d';

// KaTeX 数学公式样式。放在项目样式之前，方便项目样式覆盖它
import 'katex/dist/katex.min.css';

import '../styles/typography.generated.css';
import '../styles/index.scss';

/**
 * 看板娘（Live2D 嘉然），对应原项目 gatsby-browser.js 中注入的 /live2d-jaran.js。
 *
 * 主题设置里可以关掉它（`utils/live2d.js`）：关闭时干脆不挂载这个脚本，
 * 于是 CDN 上的 Live2D 库和模型都不会被下载。
 *
 * 首帧先渲染 null，等 effect 读完 localStorage 再决定挂不挂，
 * 这样 SSR 与首次客户端渲染一致（不会水合报警）。
 * 本来 `afterInteractive` 也是水合之后才注入脚本，所以加载时机没有变化。
 */
const Live2D = function () {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        setEnabled(getLive2DEnabled());
    }, []);

    if (!enabled) return null;

    return <Script src={withBasePath('/live2d-jaran.js')} strategy="afterInteractive" />;
};

export default function App({ Component, pageProps }) {
    return (
        <>
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1,user-scalable=no, shrink-to-fit=no"
                />
            </Head>
            <LanguageProvider>
                <Component {...pageProps} />
            </LanguageProvider>
            <Live2D />
        </>
    );
}
