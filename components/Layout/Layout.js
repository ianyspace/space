import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import { useLang } from 'context/LanguageContext';

import { rhythm } from 'utils/typography';
import LanguageBar from './LanguageBar';
import Header from './Header';
import Footer from './Footer';
import ReadModeToggle from './ReadModeToggle';
import Breadcrumbs from '../Breadcrumbs';
import ThemeBackground from './ThemeBackground';

import styles from './Layout.module.scss';

const Layout = function ({ children = null, title = null, breadcrumbs = null }) {
    const { lang, homeLink, refresh } = useLang();
    const router = useRouter();
    const scrollHeight = useRef(0);

    React.useEffect(() => {
        refresh(router.asPath);
    }, [router.asPath, refresh]);

    React.useEffect(() => {
        const contain = document.getElementById('main-contain');
        const el = document.getElementById('home-link');
        const topBar = document.getElementById('top-bar');
        if (!contain) return undefined;

        const onScroll = () => {
            const scrollTop = contain.scrollTop;

            if (topBar) {
                if (scrollTop > scrollHeight.current && scrollTop > 200) {
                    topBar.style.transform = 'translateY(-100%)';
                } else {
                    topBar.style.transform = 'translateY(0)';
                }
            }
            if (el) {
                if (scrollTop < 200) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'block';
                }
            }
            scrollHeight.current = scrollTop;
        };

        contain.addEventListener('scroll', onScroll);
        return () => contain.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <>
            <div
                className={styles['top-bar-contain']}
                style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
            >
                <LanguageBar lang={lang} base={homeLink} />
            </div>

            <div
                id="main-contain"
                style={{
                    color: 'var(--textNormal)',
                    background: 'var(--bg-outer)',
                    transition: 'color 1s, background 1s',
                    maxHeight: '100vh',
                    fontFamily: 'var(--systemFont)',
                    height: '100vh',
                    overflow: 'auto',
                    scrollBehavior: 'smooth',
                }}
            >
                <ThemeBackground />

                <div
                    style={{
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        maxWidth: rhythm(28),
                        padding: `5rem ${rhythm(3 / 4)} 2.625rem ${rhythm(3 / 4)}`,
                        background: 'var(--bg)',
                    }}
                >
                    <header className={styles['site-header']}>
                        <Header base={homeLink} title={title} />
                        <ReadModeToggle />
                    </header>
                    <Breadcrumbs
                        base={homeLink}
                        langKey={lang}
                        data={breadcrumbs}
                        showTop
                        style={{ marginTop: '-1.5rem' }}
                    />
                    {children}
                    <Footer />
                </div>
            </div>
        </>
    );
};

Layout.propTypes = {
    children: PropTypes.any,
    title: PropTypes.string,
    breadcrumbs: PropTypes.array,
};

export default Layout;
