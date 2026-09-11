import React from 'react';
import Head from 'next/head';
import Script from 'next/script';

import { LanguageProvider } from 'context/LanguageContext';
import withBasePath from 'utils/basePath';

// KaTeX 数学公式样式。放在项目样式之前，方便项目样式覆盖它
import 'katex/dist/katex.min.css';

import '../styles/typography.generated.css';
import '../styles/index.scss';

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
            {/* 看板娘（Live2D 嘉然），对应原项目 gatsby-browser.js 中注入的 /live2d-jaran.js */}
            <Script src={withBasePath('/live2d-jaran.js')} strategy="afterInteractive" />
        </>
    );
}
