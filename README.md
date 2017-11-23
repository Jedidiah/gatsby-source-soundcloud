# gatsby-source-soundcloud

A gatsby source plugin for fetching all the tracks and playlists (sets) for a SoundCloud user.

## Install

`npm install --save gatsby-source-soundcloud`


## gatsby-config.js

```javascript
plugins: [
  {
    resolve: `gatsby-source-soundcloud`,
    options: {
      userID: '<<SoundCloud UserID eg. 6058227 >>',
      clientID: '<< Add your SoundCloud client_id here>>'
    },
  },
  ...
]
```

## Examples of how to query:

Get all the playlists:

```graphql
{
  allSCplaylist {
    edges {
      node {
        title
        description
        tracks
      }
    }
  }
}
```

Get the title and description of all tracks:

```graphql
{
  allSCtrack {
    edges {
      node {
        title
        description
      }
    }
  }
}
```
