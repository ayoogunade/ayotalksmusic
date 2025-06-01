const purgecss = require('@fullhuman/postcss-purgecss')({
    content: [
        './albumlog.html',            // Directly reference HTML files in the root
        './updateAlbumReviews.js',    // Directly reference JS files in the root
        './homepage.html'             // Directly reference HTML files in the root
    ],
    defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
});

module.exports = {
    plugins: [
        require('autoprefixer'),
        ...(process.env.NODE_ENV === 'production' ? [purgecss] : [])
    ]
};
