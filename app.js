const express = require("express");
const app = express();
require("express-async-errors");
require("dotenv").config(); // to load the .env file into the process.env object
const csrf = require("host-csrf");
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth.js");
const jobsRouter = require("./routes/jobs.js");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimiter = require("express-rate-limit");

app.set("view engine", "ejs");

app.use(require("body-parser").urlencoded({ extended: true }));
app.use(helmet());
app.use(xss());

app.use(
  rateLimiter({
    windowMs: 60 * 1000, //1 minutes
    max: 60, //limit each IP to 100 requests per windowMs
  })
);

const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
let mongoURL = process.env.MONGO_URI;
if (process.env.NODE_ENV == "test") {
  mongoURL = process.env.MONGO_URI_TEST;
}

const store = new MongoDBStore({
  uri: mongoURL,
  collection: "mySessions",
});
store.on("error", function (error) {
  console.log(error);
});

const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};

const csrfOptions = {
  protected_operations: ["POST"],
  protected_content_types: [
    "application/json",
    "application/x-www-form-urlencoded",
  ],
  development_mode: true,
};

if (app.get("env") === "production") {
  app.set("trust proxy", 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
  csrfOptions.development_mode = false;
}

app.use(session(sessionParms));

app.use(require("connect-flash")());

const passport = require("passport");
const passportInit = require("./passport/passportInit.js");

passportInit();
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./middleware/storeLocals.js"));

app.use("/sessions", require("./routes/sessionRoutes.js"));

app.use(cookieParser(process.env.SESSION_SECRET));
const csrfMiddleware = csrf(csrfOptions);
app.use(csrfMiddleware);

app.use((req, res, next) => {
  if (req.path == "/multiply") {
    res.set("Content-Type", "application/json");
  } else {
    res.set("Content-Type", "text/html");
  }
  next();
});

app.get("/", (req, res) => {
  csrf.token(req, res);
  res.render("index");
});

//secret word handling.

const secretWordRouter = require("./routes/secretWord.js");

app.use("/secretWord", csrfMiddleware, auth, secretWordRouter);
app.use("/jobs", csrfMiddleware, auth, jobsRouter);

app.get("/multiply", (req, res) => {
  const result = req.query.first * req.query.second;
  if (result.isNaN) {
    result = "NaN";
  } else if (result == null) {
    result = "null";
  }
  res.json({ result: result });
});

app.use((req, res) => {
  res.status(404).send(`That page (${req.url}) was not found.`);
});

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
  console.log(err);
});

const port = process.env.PORT || 3000;

const start = () => {
  try {
    require("./db/connect")(mongoURL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();

module.exports = { app };
