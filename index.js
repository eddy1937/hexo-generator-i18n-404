const hexo_fs = require("hexo-fs");
const hexo_front_matter = require("hexo-front-matter");

const postPermalink = (post) => hexo.execFilterSync('post_permalink', post, {context: hexo});

const postPermalinkBylang = (post, lang) => {
    const cacheLang = post.lang;
    post.lang = lang;
    const path = postPermalink(post);
    post.lang = cacheLang;
    return path;
};

const i18n_404 = hexo.config.i18n_404;

const defaultInfo = {
    title: i18n_404?.default?.title ?? 'Sorry! Post Not Found',
    description: i18n_404?.default?.description,
    contentPath: i18n_404?.default?.contentPath,
}

const generatorData = (path) => {
    const md = hexo_fs.readFileSync(path);
    const data = hexo_front_matter.parse(md);
    const content = hexo.render.renderSync({ text: data._content, engine: 'md'});
    return {
        title: data.title,
        description: data.description,
        content: content,
    }
}

const generatorNotFoundPost = (path, lang) => {
    const info = i18n_404[lang];
    const contentPath = info?.contentPath ?? defaultInfo?.contentPath;
    const data = contentPath ? generatorData(contentPath) : undefined;

    return {
        path: path,
        data: {
            title: info?.title ?? data?.title ?? defaultInfo.title,
            lang: lang,
            permalink: path,
            description: info?.description ?? data?.description ?? defaultInfo.description,
            copyright: false,
            content: data?.content
        },
        layout: ['post'],
    };
}

const generatorUseOnPost = (post, path, lang) => {
    return {
        path: path,
        data: {
            ...post,
            path: path,
            lang: lang,
            permalink: path
        },
        layout: ['post'],
    };
}

hexo.extend.generator.register('i18n-404', function(locals){
    const config = this.config;
    if(!config.language) {
        return [];
    }
    const languages = new Set(config.language.filter(lang => lang !== 'default'));
    const postPermalinks = new Set();
    return Array.from(locals.posts.reduce((map, post) => {
        const link = postPermalink(post);
        postPermalinks.add(link);
        if (languages.has(post.lang) && !map.delete(link)) {
            languages.forEach((lang) => {
                if (lang === post.lang) {
                    return;
                };
                const _path = postPermalinkBylang(post, lang);
                if(!map.has(_path)) {
                    map.set(_path, generatorNotFoundPost(_path, lang));
                }
            });
        }
        const usePageOn = post?.i18n_404?.usePageOn;
        const useOnLangs = usePageOn === 'all' ? [...languages] : usePageOn;
        if (Array.isArray(useOnLangs)) {
            useOnLangs.forEach((lang) => {
                const _path = postPermalinkBylang(post, lang);
                if (!postPermalinks.has(_path)) {
                    map.set(_path, generatorUseOnPost(post, _path, lang));
                }
            });
        }
        return map;
    }, new Map()).values());
});