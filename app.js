    
/**
 * The main portion of our application. We kept all the routes here, since the Spotify login API examples were written here.
 */

var express = require('express'); 
var request = require('request');
var bodyParser = require('body-parser');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var Spotify = require('node-spotify-api');

const playlistData = require("./data/playlists");
const userData = require("./data/users");
const static = express.static(__dirname + "/public");

var client_id = '17e499e229ab45c7be7aaf03dd42b9b0'; // application client id
var client_secret = '32b5efbcbecb41d09a41c5f953030444'; // application secret
var redirect_uri = 'http://localhost:3000/callback'; // application redirect uri
var spotify = new Spotify({
  id: client_id,
  secret: client_secret
})
var userID = null;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 * used for authentication and login
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

//used to convert song durations from milliseconds to minutes:seconds
var lengthConversion = function(ms) {
  var min = Math.floor(ms / 60000);
  var sec = ((ms % 60000) / 1000).toFixed(0);
  return (sec == 60 ? (min+1) + ":00" : min + ":" + (sec < 10 ? "0" : "") + sec);
}

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
//SPOTIFY LOGIN ------------------------------------------------------------------------------------------------------------------------
//login portion of the application, after the first login, it will keep you logged in and ask for authorization each time
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // application requests authorization
  var scope = 'user-read-private user-read-email playlist-read-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

//keeps application logged in and authorized
app.get('/callback', function(req, res) {

  // application requests refresh and access tokens
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
        request.get(options, async function(error, response, body) {
          console.log(body);
          userID = body.id;
          name = body.display_name;
          email = body.email;
          if (!await userData.find(userID)){
            let newUser = await userData.create(userID, name, email);
            console.log(newUser);
          }
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
//--------------------------------------------------------------------------------------------------------------------------------------

//CHOOSING TO VIEW OR CREATE PLAYLISTS--------------------------------------------------------------------------------------------------
app.get('/choices', function(req, res) {
  res.render('playlists/playlists', {layout: "main"});
})
//--------------------------------------------------------------------------------------------------------------------------------------

//GETTING PLAYLISTS OF A USER ----------------------------------------------------------------------------------------------------------
var tracks = [];
app.get('/playlists', async function (req, res) {
  let someUser = await userData.get(userID);
  let userPlaylists = [];

  for(i = 0; i < someUser.listOfPlaylists.length; i++) {
    let temp = someUser.listOfPlaylists[i];
    let temp2 = await playlistData.get(temp);
    let temp3 = {
      id: temp2._id,
      title: temp2.title,
      numOfSongs: temp2.numOfSongs,
      display_name: someUser.name
    }
    userPlaylists.push(temp3);
  }

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
      simplifiedInfo: simplifiedInfo,
      userPlaylists: userPlaylists,
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
          length: lengthConversion(data.items[i].track.duration_ms)
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

//GETTING TRACKS OF A NON SPOTIFY PLAYLIST----------------------------------------------------------------------------------------------
var playlistID = null;
app.get('/trackInfoNonSpotify/:id', async function(req,res){
  var id = req.params.id;
  console.log(id);
  
  let someUser = await userData.get(userID);

  let temp = someUser.listOfPlaylists[id];
  playlistID = temp;
  let playlist = await playlistData.get(temp);

  let songInfo = [];
  for(i = 0; i < playlist.listOfSongs.length; i++) {
    let temp2 = {
      id: playlist.listOfSongs[i].id,
      title: playlist.listOfSongs[i].title,
      artist: playlist.listOfSongs[i].artist,
      album: playlist.listOfSongs[i].album,
      length: lengthConversion(playlist.listOfSongs[i].length)
    }

    songInfo.push(temp2);
  }
  res.render('playlists/trackInfoNonSpotify', {
    songInfo: songInfo
  })
})
//--------------------------------------------------------------------------------------------------------------------------------------

//ADDING TRACKS TO A NON SPOTIFY PLAYLIST----------------------------------------------------------------------------------------------
app.get('/addsongs/:id', async function(req,res){
  var id = req.params.id;

  spotify
    .request('https://api.spotify.com/v1/playlists/' + id + '/tracks')
    .then(function(data){
      let simplifiedInfo = [];
      for(i = 0; i < data.items.length; i++) {
        let temp = {
          id: data.items[i].track.id,
          name: data.items[i].track.name,
          artist: data.items[i].track.album.artists[0].name,
          album: data.items[i].track.album.name,
          length: lengthConversion(data.items[i].track.duration_ms)
        };

        simplifiedInfo.push(temp);
      }
      res.render('playlists/addsongs', {
        simplifiedInfo: simplifiedInfo
      })
    })
    .catch(function(err) {
      console.error('Error occurred: ' + err); 
    });
  
})
//--------------------------------------------------------------------------------------------------------------------------------------

//ADDING TRACKS TO A NON SPOTIFY PLAYLIST----------------------------------------------------------------------------------------------
app.get('/middleman/:id', async function(req,res){
  var id = req.params.id;
  
  let updatedPlaylist = await playlistData.addSong(id, playlistID);
  console.log(updatedPlaylist);

  res.redirect('/playlists');  
})

//--------------------------------------------------------------------------------------------------------------------------------------

//CHOOSING PLAYLIST TO ADD SONGS----------------------------------------------------------------------------------------------
app.get('/between', function(req,res){
  res.render('playlists/betweenadding');
})

//--------------------------------------------------------------------------------------------------------------------------------------

//SECTION FOR LITERALLY JUST GOING BACK-------------------------------------------------------------------------------------------------
app.get('/back2', function(req, res) {
  res.redirect('/playlists');
})

app.get('/back3', function(req, res) {
  res.redirect('/choices');
})
//--------------------------------------------------------------------------------------------------------------------------------------

//FORM INPUT FOR PLAYLIST CREATION------------------------------------------------------------------------------------------------------
app.get('/create', function(req, res) {
  res.render('playlists/form');
})
//--------------------------------------------------------------------------------------------------------------------------------------

//POSTING THE CREATED PLAYLIST IN THE DATABASE------------------------------------------------------------------------------------------
app.post('/list', async function(req, res) {
  var title = req.body.title;

  let newPlaylist = await playlistData.create(title);
  console.log(newPlaylist);
  let updatedUser = await userData.addPlaylist(userID, newPlaylist._id);
  console.log(updatedUser);

  res.redirect('/playlists');
})
//--------------------------------------------------------------------------------------------------------------------------------------

//SPOTIFY REFRESH TOKEN TO REMAIN LOGGED IN---------------------------------------------------------------------------------------------
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
//--------------------------------------------------------------------------------------------------------------------------------------

console.log('Listening on 3000');
app.listen(3000);