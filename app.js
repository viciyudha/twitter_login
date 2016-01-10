var express           =     require('express'),
    passport          =     require('passport'),
    util              =     require('util'),
    TwitterStrategy   =     require('passport-twitter').Strategy,
    session           =     require('express-session'),
    cookieParser      =     require('cookie-parser'),
    bodyParser        =     require('body-parser'),
    config            =     require('./configuration/config'),
    mysql             =     require('mysql'),
    app               =     express(),
    twit              =     require('twit');

// Connection to Twitter
var T;

//Define MySQL parameter in Config.js file.
var con = mysql.createConnection({
  host     : config.host,
  user     : config.username,
  password : config.password,
  database : config.database
});

//Connect to Database only if Config.js parameter is set.

if(config.use_database=='true')
{
    con.connect(function(err){
      if(err){
        console.log('Error connecting to Db');
        return;
      }
      console.log('Connection established');
    });
} else {
  console.log('Notuse database');
};


// Passport session setup.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the TwitterStrategy within Passport.
passport.use(new TwitterStrategy({
    consumerKey: config.twitter_api_key,
    consumerSecret: config.twitter_api_secret,
    callbackURL: config.callback_url
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      //Check whether the User exists or not using profile.id
      if(config.use_database==='true')
      {
      var q = "SELECT * from user where user_id=" + profile.id;

      T = new twit({
          consumer_key:         config.twitter_api_key,
          consumer_secret:      config.twitter_api_secret,
          access_token:         token,
          access_token_secret:  tokenSecret,
      });

      con.query(q,function(err,rows,fields){
        if(err) throw err;
        if(rows.length===0)
          {
            console.log("There is no such user, adding now" + profile.id);
            con.query("INSERT into user(user_id,user_name) VALUES('"+profile.id+"','"+profile.username+"')");
          }
          else
            {
              console.log("User already exists in database");
            }
          });
      }
      return done(null, profile);
    });
  }
));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({ secret: 'keyboard cat', key: 'sid'}));
//app.use(session({ secret: 'keyboard cat', key: 'sid', cookie: { secure: false }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
  console.log(req.profile);
});

app.get('/post', ensureAuthenticated, function(req, res) {
  T.post('statuses/update', { status: 'hello world! [2]' }, function(err, data, response) {
  console.log(data)
})
});

app.get('/auth/twitter', passport.authenticate('twitter'));


app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { successRedirect : '/', failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

app.listen(3000);
