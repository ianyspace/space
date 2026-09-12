/* eslint-disable no-empty */
export default function themeOper() {
    const onThemeChangeFuncObj = {};
    let preferredTheme;
    // Body font choice (`utils/fontChoice.js`): 'system' adds the `font-system`
    // class on <body>; anything else keeps the default LXGW WenKai Screen.
    let fontSystem = false;

    function render() {
        document.body.className = preferredTheme + (fontSystem ? ' font-system' : '');
    }

    function setTheme(newTheme) {
        window.__theme = newTheme;
        preferredTheme = newTheme;
        render();
        Object.values(onThemeChangeFuncObj).forEach((func) => func(newTheme));
    }

    try {
        preferredTheme = localStorage.getItem('theme');
    } catch (err) { }

    try {
        fontSystem = localStorage.getItem('fontChoice') === 'system';
    } catch (err) { }

    window.__setPreferredTheme = function (newTheme) {
        setTheme(newTheme);
        try {
            localStorage.setItem('theme', newTheme);
        } catch (err) { }
    };

    window.__setPreferredFont = function (choice) {
        fontSystem = choice === 'system';
        render();
        try {
            localStorage.setItem('fontChoice', fontSystem ? 'system' : 'wenkai');
        } catch (err) { }
    };

    window.__subOnThemeChange = function (key, func) {
        onThemeChangeFuncObj[key] = func;
    };

    window.__unsubOnThemeChange = function (key) {
        Reflect.deleteProperty(onThemeChangeFuncObj, key);
    };

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkQuery.addListener(function (e) {
        window.__setPreferredTheme(e.matches ? 'dark' : 'light');
    });

    setTheme(preferredTheme || (darkQuery.matches ? 'dark' : 'light'));
}
