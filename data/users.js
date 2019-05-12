const mongoCollections = require("./../Config/mongoCollections");
const users = mongoCollections.users;

//Functions to manage the users in our database
module.exports = {
    //method to create user
    async create(id, name, email){
        if (typeof id !== "string"){
            throw "Please provide a valid id";
        }
        if (typeof name !== "string"){
            throw "Please provide a valid name";
        }
        if (typeof email !== "string"){
            throw "Please provide valid email";
        }

        const userCollection = await users();

        let newUser = {
            id : id,
            name : name,
            email: email,
            listOfPlaylists: []
        };

        const insertInfo = await userCollection.insertOne(newUser);

        if (insertInfo.insertedCount === 0){
            throw "Could not add user";
        }

        const user = await this.get(id);
        return user;

    },
    //method to determine if user exists. if user does not exist, the routes will create a new user
    async find(id){
        if (!id) throw "Please provide a valid ID to search";

        const userCollection = await users();
        const user = await userCollection.findOne({id: id });
        if (user === null){
            return false;
        }
        return true;
    },
    //method to get user and return the desired user object
    async get(id){
        if (!id) throw "Please provide a valid ID to search";

        const userCollection = await users();
        const user = await userCollection.findOne({id: id });
        if (user === null){
            throw "No user with that ID";
        }

        return user;
    },
    //method to add a playlist to a user
    async addPlaylist(userID, playlistID){
        const userCollection = await users();
        // let user = await this.get(userID);
        const updateInfo = await userCollection.updateOne({id : userID}, {
            $addToSet: {
                listOfPlaylists: playlistID
            }
        });
    
        if (updateInfo.modifiedCount === 0) {
            throw "could not update user successfully";
        }

        return await this.get(userID);
    }
}