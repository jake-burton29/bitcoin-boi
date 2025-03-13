require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  {
    dialect: "postgres",
    protocol: "postgres",
    dialectOptions: {},
  }
);

let PageLoads = sequelize.define(
  "page_loads",
  {
    userAgent: { type: Sequelize.STRING, primaryKey: true },
    time: { type: Sequelize.DATE, primaryKey: true },
  },
  { timestamps: false }
);

app.use(express.json());
app.get("/", async (req, res) => {
  const userAgent = req.get("user-agent");
  const time = new Date().getTime();

  try {
    await PageLoads.create({
      userAgent,
      time,
    });
    const messages = await PageLoads.findAll();
    res.send(messages);
  } catch (error) {
    console.log("Error inserting data", error);
  }
});
app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
