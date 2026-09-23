import React from 'react';
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

// The bar reacts to a gesture, not to a scroll event: it only moves once the page
// has travelled this far in one direction. A single wheel notch scrolls about
// 100px, so any threshold below that reads as "the bar flips on every notch" —
// these are deliberately above one notch, so one notch never moves it. Showing it
// again also asks for more travel than hiding it did, since the annoying case is
// the bar popping back in over a small upward readjustment.
const BAR_HIDE_AFTER_PX = 240; // downward travel before it steps aside
const BAR_SHOW_AFTER_PX = 320; // upward travel before it comes back
// Above this the reader is still at the top of the page, where the bar always
// belongs on screen. Travel is only counted once past it, so the bar actually
// leaves somewhere around 440px down.
const BAR_ALWAYS_VISIBLE_PX = 200;
// The bar's own title only appears once the reader is past the article header.
// Two thresholds rather than one, so hovering on the line does not make it blink.
const TITLE_SHOW_AFTER_PX = 200;
const TITLE_HIDE_BELOW_PX = 160;

const Layout = function ({ children = null, title = null, breadcrumbs = null }) {
    const { lang, homeLink, refresh } = useLang();
    const router = useRouter();

    React.useEffect(() => {
        refresh(router.asPath);
    }, [router.asPath, refresh]);

    React.useEffect(() => {
        const contain = document.getElementById('main-contain');
        const el = document.getElementById('home-link');
        const topBar = document.getElementById('top-bar');
        if (!contain) return undefined;

        const moveBar = (hidden) => {
            if (topBar) topBar.style.transform = hidden ? 'translateY(-100%)' : 'translateY(0)';
        };

        let lastTop = contain.scrollTop;
        let travel = 0; // net travel since the bar last moved
        let barHidden = false;

        const onScroll = () => {
            const scrollTop = contain.scrollTop;
            const step = scrollTop - lastTop;
            lastTop = scrollTop;

            if (el) {
                if (scrollTop > TITLE_SHOW_AFTER_PX) el.style.display = 'block';
                else if (scrollTop < TITLE_HIDE_BELOW_PX) el.style.display = 'none';
            }

            if (scrollTop <= BAR_ALWAYS_VISIBLE_PX) {
                travel = 0;
                if (barHidden) {
                    barHidden = false;
                    moveBar(false);
                }
                return;
            }

            // Only the direction that can still change something is accumulated,
            // so jitter cancels itself out instead of tipping the bar over.
            if (barHidden) {
                travel = Math.min(0, travel + step);
                if (travel <= -BAR_SHOW_AFTER_PX) {
                    travel = 0;
                    barHidden = false;
                    moveBar(false);
                }
            } else {
                travel = Math.max(0, travel + step);
                if (travel >= BAR_HIDE_AFTER_PX) {
                    travel = 0;
                    barHidden = true;
                    moveBar(true);
                }
            }
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
