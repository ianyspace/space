const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'content', 'blog');
const OUTPUT = path.join(ROOT, 'public', 'search-index.json');
const DEFAULT_LANG = 'zh-hans';
const LANGUAGES = ['zh-hans', 'en'];

function makeExcerpt(content, len = 180) {
    const text = content
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/~~~[\s\S]*?~~~/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/(\*\*|__|\*|_)/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length <= len) return text;
    return `${text.slice(0, len).trim()}…`;
}

function fileNameFor(lang) {
    return lang === DEFAULT_LANG ? 'index.mdx' : `index.${lang}.mdx`;
}

function main() {
    const entries = [];

    fs.readdirSync(BLOG_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .forEach(({ name: dirName }) => {
            LANGUAGES.forEach((lang) => {
                const filePath = path.join(BLOG_DIR, dirName, fileNameFor(lang));
                if (!fs.existsSync(filePath)) return;

                const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
                entries.push({
                    lang,
                    slug: `/${lang === DEFAULT_LANG ? '' : `${lang}/`}${dirName}/`,
                    title: data.title || dirName,
                    description: data.description || '',
                    excerpt: makeExcerpt(content),
                    tags: Array.isArray(data.tags) ? data.tags : [],
                });
            });
        });

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, `${JSON.stringify(entries)}\n`);
    process.stdout.write(`[gen:search] ${entries.length} searchable article(s) written\n`);
}

main();
