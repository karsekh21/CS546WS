# CS546WS

**New Music Finder by Karun Sekhar (10413883) and Ahsan Shahab (10407902)**

_An application where you can view your already created Spotify playlists and create new ones using recent Spotify chart data._

__SETUP__
1) Open command prompt and cd to the project folder
2) Run "npm install" to install all the necessary dependencies
3) Run "npm start" to start the application
4) Open up your browser and go to "localhost:3000/"

__RUNNING THE APPLICATION__
1) Press the login button to login into Spotify
2) You can either use your own Spotify account, but we have made an account for you
    - Email address:  ksekhar@stevens.edu
    - Password:       cs546project
3) Upon logging in, you will see your Spotify user data. 
4) Here you can choose to view playlists or create playlists.
    - Creating playlists will show a form that will simply ask for the name of the playlist.
        - The user is then redirected to viewing playlists where they can see their newly created playlist
    - Viewing playlists on a newly created user will display the Spotify playlists created by the user as well as the created playlists in the library. 
    - You can click on the names of these playlists.
        - Clicking playlists pulled from Spotify (indicated by public = true) will show the songs in the playlist and their data
        - Clicking playlists that the user created in the application will show added songs and their data.
    - You can add songs to the playlists created in the application by clicking the add songs button
        - From there, you can choose from three song charts that are pulled from Spotify to add songs to your playlist
        - These charts are updated weekly by Spotify, allowing for new music to be searched for every week.
        - Click on the song to add it to the playlist, and then click the playlist to see the newly added song.
