// Adds what app.json can't hold: the Google Maps key for Android, read from the
// build environment (EAS environment variable GOOGLE_MAPS_API_KEY; never
// committed). Without a key, Android shows "Use my location" instead of a map
// (extra.androidMaps), and iOS always uses Apple Maps, which needs no key.
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ["react-native-maps", key ? { androidGoogleMapsApiKey: key } : {}]],
    extra: { ...config.extra, androidMaps: Boolean(key) },
  };
};
