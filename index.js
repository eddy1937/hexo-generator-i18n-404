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

hexo.extend.generator.register('i18n-404', function(locals){
    const config = this.config;
    if(!config.language) {
        return [];
    }
    const languages = new Set(config.language.filter(lang => lang !== 'default'));
    return Array.from(locals.posts.reduce((map, post) => {
        if (languages.has(post.lang) && !map.delete(postPermalink(post))) {
            languages.forEach((lang) => {
                if (lang === post.lang) {
                    return;
                };
                const _path = postPermalinkBylang(post, lang);
                map.set(_path, generatorNotFoundPost(_path, lang));
            });
        }
        return map;
    }, new Map()).values());
});