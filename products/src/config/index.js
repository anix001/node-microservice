const path = require("path");
const dotEnv = require("dotenv");

if (process.env.NODE_ENV !== "prod") {
  dotEnv.config({ path: path.resolve(__dirname, '../../.env.dev') });
} else {
  dotEnv.config();
}


module.exports = {
  PORT: process.env.PORT,
  DB_URL: process.env.MONGODB_URI,
  APP_SECRET: process.env.APP_SECRET,
};