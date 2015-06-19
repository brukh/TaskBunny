var config = require('./config.js');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var SESSION_SECRET;

var passport = require('passport');
var GoogleStratergy  = require('passport-google-oauth').OAuth2Strategy;
var GOOGLE_SECRETS;


if(process.env.NODE_ENV === 'production' ) {
  //store the client id and secret in environment variable
  GOOGLE_SECRETS = {
    id: process.env.GOOGLE_APP_ID,
    secret: process.env.GOOGLE_APP_SECRET
  };

  //a long text string for signing session cookies
  SESSION_SECRET = process.env.SESSION_SECRET;
} else {

  //for local dev store client id and secret in these files
  GOOGLE_SECRETS = require('../secrets/google.json');
  SESSION_SECRET = require('../secrets/session.json').secret;
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStratergy({
      clientID: GOOGLE_SECRETS.id,
      clientSecret: GOOGLE_SECRETS.secret,
      callbackURL: "http://localhost:8000/auth/google/callback/"
    },
    function(accessToken, refreshToken, profile, done) {
      /* todo: store user in database
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return done(err, user);
      });
      */
      done(null, profile);
    }
));

module.exports = function(app) {

  app.use(session({
    secret: SESSION_SECRET,
    store: new MongoStore({
      url: config.MONGODB_URL
    })
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/auth/google',
    passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/plus.login' }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/#/sign-in' }),
    function(req, res) {
      res.redirect('/#/tasks');
  });

  app.get('/login', function(req, res){
    res.redirect('/auth/google');
  });

  app.get('/logout', function(req, res){
    req.logout();
    req.session.destroy(function(){
      res.redirect('/');
    });
  });

  //api to check on client side if session is authenticated
  app.get('/auth/google/check', function(req, res, next){
    if(req.isAuthenticated()){
      res.status(200).send({authenticated:true});
    } else {
      res.status(401).send({authenticated:false});
    }
  });

};
