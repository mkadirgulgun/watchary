// app.json'a ek olarak, web sitesi bir alt klasörde yayınlanırken (GitHub Pages:
// kullanici.github.io/depo-adi) adres önekini ortam değişkeninden alır.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
