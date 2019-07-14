const axios = require("axios");
const crypto = require("crypto");

const internalType = type => `soundcloud${type}`;

const internalId = (id, type) => `${internalType(type)}-${id}`;

const createHash = obj =>
  crypto
    .createHash("md5")
    .update(JSON.stringify(obj))
    .digest("hex");

const processEntity = entity => ({
  ...entity,
  parent: "__SOURCE__",
  children: [],
  internal: {
    type: internalType(entity.kind),
    contentDigest: createHash(entity)
  }
});

const collectTracksFromPlaylist = (accTracks, playlist) => [
  ...accTracks,
  ...playlist.tracks
];

const addIfUnique = (uniqueItems, item) =>
  uniqueItems.find(t => t.id === item.id)
    ? uniqueItems
    : [...uniqueItems, item];

const addReverseLink = (node, linkedNode) => {
  if (linkedNode[`${node.kind}s___NODE`] === undefined) {
    linkedNode[`${node.kind}s___NODE`] = [];
  }
  linkedNode[`${node.kind}s___NODE`].push(node.id);
};

function fetchUserResource(resource, userID, clientID) {
  const url = `https://api.soundcloud.com/users/${userID}${resource}?client_id=${clientID}`;
  return axios.get(url);
}

function linkNodes(nodes) {
  return nodes
    .map(n => {
      n.soundcloud_id = n.id;
      n.id = internalId(n.id, n.kind);
      return n;
    })
    .map(n => {
      let user = undefined;

      if (n.user) {
        user = nodes.find(u => u.id === internalId(n.user.id, n.user.kind));

        if (user) {
          // Add link to user node
          n.user___NODE = internalId(n.user.id, n.user.kind);
          delete n.user;

          // Add reverse link to node on user
          addReverseLink(n, user);
        }
      }

      if (n.tracks) {
        // Add links to tracks on node
        n.tracks___NODE = n.tracks.map(t => internalId(t.id, t.kind));

        // Add reverse links to node on tracks and users
        n.tracks.map(t => {
          const track = nodes.find(u => u.id === internalId(t.id, t.kind));
          if (track) {
            addReverseLink(n, track);
          }
          if (user) {
            addReverseLink(n, user);
          }
        });

        delete n.tracks;
      }

      return n;
    });
}

exports.sourceNodes = async ({ boundActionCreators }, { userID, clientID }) => {
  const { createNode } = boundActionCreators;

  try {
    // Fetch data
    const userInfo = await fetchUserResource("", userID, clientID);
    const playlists = await fetchUserResource("/playlists", userID, clientID);
    const tracks = await fetchUserResource("/tracks", userID, clientID);

    const tracksFromPlaylists = playlists.data.reduce(
      collectTracksFromPlaylist,
      []
    );
    const combinedTracks = tracksFromPlaylists.reduce(addIfUnique, tracks.data);

    const users = [userInfo.data];
    const combinedUsers = combinedTracks.reduce(addIfUnique, users);

    const entities = linkNodes([
      ...users,
      ...playlists.data,
      ...combinedTracks
    ]);

    // Process data into nodes.
    entities.forEach(entity => createNode(processEntity(entity)));

    // We're done, return.
    return;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
