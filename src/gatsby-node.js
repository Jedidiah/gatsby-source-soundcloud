const axios = require('axios');
const crypto = require('crypto');

const fetchUserResource = (resource, userID, clientID) => {
  const url = `https://api.soundcloud.com/users/${userID}${resource}?client_id=${clientID}`;
  return axios.get(url);
}

function createHash(obj) {
  return crypto.createHash('md5')
               .update(JSON.stringify(obj))
               .digest('hex');
}

const internalType = type => `soundcloud${type}`;
const internalId = (id, type) => `${internalType(type)}-${id}`;

const processEntity = (entity) => {
  return {
    ...entity,
    parent: '__SOURCE__',
    children: [],
    internal: {
      type: internalType(entity.kind),
      contentDigest: createHash(entity),
    }
  };
};

const getTracksFromPlaylist = (accTracks, playlist) => [...accTracks, ...playlist.tracks];

function addIfUnique(uniqueItems, item) {
  if (!uniqueItems.find(t => t.id === item.id)) {
    return [...uniqueItems, item];
  }
  return uniqueItems;
}

function linkNodes(users, playlists, tracks) {
  const updatedUsers = users.map((user) => {
    user.soundcloud_id = user.id;
    user.id = internalId(user.id, user.kind);
    return user;
  });

  const updatedTracks = tracks.map((track) => {
    track.soundcloud_id = track.id;
    track.id = internalId(track.id, track.kind);

    const user = users.find(u => u.soundcloud_id === track.user.id);

    if (user) {
      track.user___NODE = internalId(track.user.id, track.user.kind);
      if (user.tracks___NODE === undefined) {
        user.tracks___NODE = [];
      }
      user.tracks___NODE.push(track.id);
      delete track.user;
    }
    return track;
  });

  const updatedPlaylists = playlists.map((playlist) => {
    playlist.soundcloud_id = playlist.id;
    playlist.id = internalId(playlist.id, playlist.kind);

    playlist.tracks___NODE = playlist.tracks.map((playlistTrack) => {
      const id = internalId(playlistTrack.id, playlistTrack.kind);
      const track = updatedTracks.find(t => t.d === id);
      if (track) {
        if (track.playlists___NODE === undefined) {
          track.playlists___NODE = [];
        }
        track.playlists___NODE.push(id);
      }
      return id;
    });
    delete playlist.tracks;

    const user = users.find(u => u.soundcloud_id === playlist.user.id);
    if (user) {
      playlist.user___NODE = internalId(playlist.user.id, playlist.user.kind);
      if (user.playlists___NODE === undefined) {
        user.playlists___NODE = [];
      }
      user.playlists___NODE.push(playlist.id);
      delete playlist.user;
    }

    return playlist;
  });

  return [...updatedUsers, ...updatedTracks, ...updatedPlaylists];
}

exports.sourceNodes = async ({ boundActionCreators }, { userID, clientID }) => {
  const { createNode } = boundActionCreators;

  try {
    // Fetch data
    const userInfo = await fetchUserResource('', userID, clientID);
    const playlists = await fetchUserResource('/playlists', userID, clientID);
    const tracks = await fetchUserResource('/tracks', userID, clientID);


    const tracksFromPlaylists = playlists.data.reduce(getTracksFromPlaylist, []);
    const combinedTracks = tracksFromPlaylists.reduce(addIfUnique, tracks.data);

    const users = [userInfo.data];
    const combinedUsers = combinedTracks.reduce(addIfUnique, users);

    const entities = linkNodes(users, playlists.data, combinedTracks);

    // Process data into nodes.
    entities.forEach(entity => createNode(processEntity(entity)));

    // We're done, return.
    return;

  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
