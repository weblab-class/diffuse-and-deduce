const { OAuth2Client } = require("google-auth-library");
const User = require("./models/user");

const CLIENT_ID = "199130750908-mjfqj052l47dekm5kdd3j8c5cmk9d5j0.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

function verify(token) {
  return client
    .verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    })
    .then((ticket) => ticket.getPayload());
}

function getOrCreateUser(user) {
  // the "sub" field means "subject", which is a unique identifier for each user
  return User.findOne({ googleid: user.sub }).then((existingUser) => {
    if (existingUser) {
      return existingUser.toObject();
    }

    const newUser = new User({
      name: user.name,
      googleid: user.sub,
    });

    return newUser.save().then((savedUser) => savedUser.toObject());
  });
}

function login(req, res) {
  verify(req.body.token)
    .then((user) => getOrCreateUser(user))
    .then((user) => {
      req.session.user = user;
      res.send(user);
    })
    .catch((err) => {
      res.status(401).send({
        error: err.message || "Unauthorized",
        details: err,
      });
    });
}

function logout(req, res) {
  req.session.user = null;
  res.send({});
}

function populateCurrentUser(req, res, next) {
  req.user = req.session.user;
  next();
}

function ensureLoggedIn(req, res, next) {
  if (!req.user) {
    return res.status(401).send({ err: "not logged in" });
  }

  next();
}

module.exports = {
  login,
  logout,
  populateCurrentUser,
  ensureLoggedIn,
};
