module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [], // or leave plugins out entirely if it's empty
    };
};
