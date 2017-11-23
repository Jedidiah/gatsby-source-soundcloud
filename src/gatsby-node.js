const axios = require('axios');
const crypto = require('crypto');

const fetchResource = (resource, userID, clientID) => {
  const url = `https://api.soundcloud.com/users/${userID}/${resource}?client_id=${clientID}`;
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

  const children = (datum.kind === 'playlist')
                   ? datum.tracks.map(t => processDatum(t))
                   : [];

  return {
    ...datum,
    parent: '__SOURCE__',
    children,
    internal: { id, type, contentDigest }
  };
}

exports.sourceNodes = async ({ boundActionCreators }, { userID, clientID }) => {
  const { createNode } = boundActionCreators;

  try {
    const userInfo = await fetchResource('users', userID, clientID);
    const playlists = await fetchResource('playlists', userID, clientID);
    const tracks = await fetchResource('tracks', userID, clientID);

    // Process data into nodes.
    data.forEach(datum => createNode(processDatum(datum)));

    // We're done, return.
    return;

  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
