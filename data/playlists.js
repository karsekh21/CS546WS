const mongoCollections = require("./../Config/mongoCollections");
const playlists = mongoCollections.playlists;
const Spotify = require('node-spotify-api');
var spotify = new Spotify({
    id: '17e499e229ab45c7be7aaf03dd42b9b0',
    secret: '32b5efbcbecb41d09a41c5f953030444'
  });

module.exports = {
    async create(title, genre, tags) {
        if (typeof title !== "string"){
            throw "Please provide a valid name";
        }
        if (typeof genre !== "string"){
            throw "Please provide a valid genre";
        }
        if (typeof tags !== "string"){
            throw "Please provide valid tags";
        }

        const playlistCollection = await playlists();

        let newPlaylist = {
            title : title,
            genre : genre,
            numOfSongs: 0,
            lengthEst: 0, //
            tags: tags,
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
    async remove(id) {
        if (!id) throw "Please provide a valid ID to search";

        const playlistCollection = await playlists();
        const playlist = await this.get(id);

        const deletionInfo = await playlistCollection.removeOne({_id: id });
        if (deletionInfo.deletedCount === 0) {
            throw "Could not delete playlist";
        }
        return {deleted : true, data : playlist};
    },
    async get(id) {
        if (!id) throw "Please provide a valid ID to search";

        const playlistCollection = await playlists();
        const playlist = await playlistCollection.findOne({_id: id });
        if (playlist === null){
            throw "No playlist with that ID";
        }

        return playlist;
    },
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
                            artist: data.artists.name,
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

                const updateInfo = await playlistCollection.updateOne({_id: id}, updatedPlaylist);
                if (updateInfo.modifiedCount === 0) {
                    throw "could not update playlist successfully";
                }
        
                return await this.get(id);
            });
    },
    async deleteSong(songID, playlistID){
        const playlistCollection = await playlists();
        let playlist = await this.get(playlistID);
        spotify.request('https://api.spotify.com/v1/tracks/' + songID)
            .then(async function(data) {
                await playlistCollection.updateOne({_id : playlistID}, {
                    $pull: {
                        listOfSongs:{
                            id: songID
                        }
                    }
                });
                let updatedInfo = {
                    numOfSongs: playlist.numOfSongs - 1,
                    lengthEst: playlist.lengthEst - data.duration_ms
                };

                let updatedPlaylist = { 
                    $set: updatedInfo
                };

                const updateInfo = await playlistCollection.updateOne({_id: id}, updatedPlaylist);
                if (updateInfo.modifiedCount === 0) {
                    throw "could not update playlist successfully";
                }
        
                return await this.get(id);
            });
    }
}