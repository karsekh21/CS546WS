/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var bodyParser = require('body-parser');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var Spotify = require('node-spotify-api');

const playlistData = require("./data/playlists");
const static = express.static(__dirname + "/public");

var client_id = '17e499e229ab45c7be7aaf03dd42b9b0'; // Your client id
var client_secret = '32b5efbcbecb41d09a41c5f953030444'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri
var spotify = new Spotify({
  id: client_id,
  secret: client_secret
})
var userID = null;
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

const exphbs = require("express-handlebars");

app.use("/public", static);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-read-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
          userID = body.id;
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});


app.get('/choices', function(req, res) {
  res.render('playlists/playlists', {layout: "main"});
})
//GETTING PLAYLISTS OF A USER ----------------------------------------------------------------------------------------------------------
var tracks = [];
app.get('/playlists', function (req, res) {

  spotify
    .request('https://api.spotify.com/v1/users/' + userID + '/playlists')
    .then(function(data) {
      console.log(data);
      let simplifiedInfo = [];
      for(i = 0; i < data.items.length; i++){
        let temp = {
          name: data.items[i].name,
          id: data.items[i].id,
          owner: {
            display_name: data.items[i].owner.display_name,
            id: data.items[i].owner.id
          },
          public: data.items[i].public,
          total_tracks: data.items[i].tracks.total
        };

        tracks.push(temp.id);
        simplifiedInfo.push(temp);
      }
    res.render('playlists/spotifyList', {
      simplifiedInfo: simplifiedInfo
    })
  })
  .catch(function(err) {
    console.error('Error occurred: ' + err); 
  });
})
//--------------------------------------------------------------------------------------------------------------------------------------

//GETTING TRACKS OF A PLAYLIST----------------------------------------------------------------------------------------------------------
app.get('/trackInfo/:id', function(req,res){
  var id = req.params.id;
  
  spotify
    .request('https://api.spotify.com/v1/playlists/' + id + '/tracks')
    .then(function(data){
      let simplifiedInfo = [];
      for(i = 0; i < data.items.length; i++) {
        let temp = {
          name: data.items[i].track.name,
          artist: data.items[i].track.album.artists[0].name,
          album: data.items[i].track.album.name,
          length: data.items[i].track.duration_ms
        };

        simplifiedInfo.push(temp);
      }
      res.render('playlists/trackInfo', {
        simplifiedInfo: simplifiedInfo
      })
    })
    .catch(function(err) {
      console.error('Error occurred: ' + err); 
    });
})

//--------------------------------------------------------------------------------------------------------------------------------------
app.get('/create', function(req, res) {
  res.render('playlists/form');
})

app.post('/list', async function(req, res) {
  var title = req.body.title;
  var genre = req.body.genre;
  var tags = req.body.tags;

  let newPlaylist = await playlistData.create(title, genre, tags);
  console.log(newPlaylist);

  res.render('playlists/listedPlaylists', {
    title: newPlaylist.title,
    genre: newPlaylist.genre,
    tags: newPlaylist.tags,
    id: newPlaylist._id
  });
})
app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 3000');
app.listen(3000);
