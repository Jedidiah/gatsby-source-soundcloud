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

function processDatum(datum) {
  const type = `SC${datum.kind}`;
  const id = `${type}-${datum.id}`;
  const contentDigest = createHash(datum);

  return {
    ...datum,
    id,
    originalID: `${datum.id}`,
    parent: '__SOURCE__',
    children: [],
    internal: { type, contentDigest }
  };
}

exports.sourceNodes = async ({ boundActionCreators }, { userID, clientID }) => {
  const { createNode } = boundActionCreators;

  try {
    // Fetch data
    const userInfo = await fetchUserResource('', userID, clientID);
    const playlists = await fetchUserResource('/playlists', userID, clientID);
    const tracks = await fetchUserResource('/tracks', userID, clientID);

    // Process data into nodes.
    processDatum(userInfo.data);
    playlists.data.forEach(datum => createNode(processDatum(datum)));
    tracks.data.forEach(datum => createNode(processDatum(datum)));

    // We're done, return.
    return;

  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
