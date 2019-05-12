const mongoCollections = require("./../Config/mongoCollections");
const playlists = mongoCollections.playlists;
const Spotify = require('node-spotify-api');
var spotify = new Spotify({
    id: '17e499e229ab45c7be7aaf03dd42b9b0',
    secret: '32b5efbcbecb41d09a41c5f953030444'
  });

//functions to manage the playlists in our database
module.exports = {
    //method to create a playlist
    async create(title) {
        if (typeof title !== "string"){
            throw "Please provide a valid name";
        }

        const playlistCollection = await playlists();

        let newPlaylist = {
            title : title,
            numOfSongs: 0,
            lengthEst: 0, //
            listOfSongs: []
        };

        const insertInfo = await playlistCollection.insertOne(newPlaylist);

        if (insertInfo.insertedCount === 0){
            throw "Could not add playlist";
        }
        // console.log(insertInfo);
        const newId = insertInfo.insertedId;
        // console.log(newId);
        const playlist = await this.get(newId);
        return playlist;
    },
    //method to get playlist and return the desired playlist object
    async get(id) {
        if (!id) throw "Please provide a valid ID to search";

        const playlistCollection = await playlists();
        const playlist = await playlistCollection.findOne({_id: id });
        if (playlist === null){
            throw "No playlist with that ID";
        }

        return playlist;
    },
    //method to add a song to a playlist
    async addSong(songID, playlistID) {
        const playlistCollection = await playlists();
        let playlist = await this.get(playlistID);
        spotify.request('https://api.spotify.com/v1/tracks/' + songID)
            .then(async function(data) {
                await playlistCollection.updateOne({_id : playlistID}, {
                    $addToSet: {
                        listOfSongs:{
                            id: songID,
                            title: data.name,
                            artist: data.artists[0].name,
                            album: data.album.name,
                            length: data.duration_ms,
                            inPlaylist: true
                        }
                    }
                });
                let updatedInfo = {
                    numOfSongs: playlist.numOfSongs + 1,
                    lengthEst: playlist.lengthEst + data.duration_ms
                };

                let updatedPlaylist = { 
                    $set: updatedInfo
                };

                const updateInfo = await playlistCollection.updateOne({_id: playlistID}, updatedPlaylist);
                if (updateInfo.modifiedCount === 0) {
                    throw "could not update playlist successfully";
                }
            });
            return await this.get(playlistID);
    }
}
