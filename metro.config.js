const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SIZE FIX 4: Exclude server-side packages from the mobile bundle
config.resolver.blockList = [
  /server\/.*/,
  /server_dist\/.*/,
  /migrations\/.*/,
];

module.exports = config;
