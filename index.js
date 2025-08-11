const packageJson = require('./package.json');

console.log(`Welcome to ${packageJson.name} version ${packageJson.version}`);

module.exports = {
  version: packageJson.version,
  name: packageJson.name
};