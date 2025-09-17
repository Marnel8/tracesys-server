const path = require("path");

module.exports = {
  config: path.resolve("./config/config.json"),
  modelsPath: path.resolve("./src/db/models"),
  seedersPath: path.resolve("./seeders"),
  migrationsPath: path.resolve("./src/db/migrations"),
};
