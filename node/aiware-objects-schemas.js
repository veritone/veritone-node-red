const Schemas = {
    'watchlist.create': {
        title: 'Create Watchlist',
        params: [
            { field: 'startDateTime', type: 'string' },
            { field: 'stopDateTime', required: true, type: 'string' },
            { field: 'name', required: true },
            { field: 'sourceTypeIds', type: 'array', items: { type: 'string' } },
            { field: 'sourceIds', type: 'array', items: { type: 'string' } },
            { field: 'details', type: 'object' }
        ]
    },
    'watchlist.update': {
        title: 'Update Watchlist',
        params: [
            { field: 'id', required: true },
            { field: 'startDateTime' },
            { field: 'stopDateTime' },
            { field: 'name' },
            { field: 'sourceTypeIds', type: 'array', items: { type: 'string' } },
            { field: 'sourceId', type: 'array', items: { type: 'string' } },
            { field: 'details', type: 'object' },
            { field: 'isDisabled', type: 'boolean' }
        ]
    },
    'watchlist.delete': {
        title: 'Update Watchlist',
        params: [
            { field: 'id', required: true },
        ]
    },
    'watchlist.read': {
        title: 'Read Watchlist',
        params: [
            { field: 'id' },
            { field: 'minStartDateTime' },
            { field: 'maxStartDateTime' },
            { field: 'minStopDateTime' },
            { field: 'maxStopDateTime' },
            { field: 'offset', type: 'number' },
            { field: 'limit', type: 'number' },
            { field: 'orderBy', type: 'string', enum: ['createdDateTime', 'modifiedDateTime', 'stopDateTime', 'startDateTime', 'name'] },
            { field: 'orderDirection', type: 'string', enum: ['desc', 'asc'] },
            { field: 'isDisabled', type: 'boolean' }
        ],
        props: [
            { field: 'id', required: true },
            { field: 'name' },
            { field: 'organizationId' },
            { field: 'scheduleIds' },
            { field: 'startDateTime' },
            { field: 'stopDateTime' },
            { field: 'createdDateTime' },
            { field: 'sourceTypeIds' },
            { field: 'sourceIds' },
            { field: 'details' },
            { field: 'query' },
            { field: 'brandId' },
            { field: 'isDisabled' }
        ]
    },
    'collection.create': {
        title: 'Create a collection',
        params: [
            { field: 'name', required: true },
            { field: 'folderDescription' },
            { field: 'image' }
        ]
    },
    'collection.update': {
        title: 'Update a collection',
        params: [
            { field: 'folderId', title: 'id', required: true },
            { field: 'name' },
            { field: 'folderDescription' },
            { field: 'image' }
        ]
    },
    'collection.delete': {
        title: 'Delete a collection',
        params: [
            { field: 'id' }
        ]
    },
    'collection.read': {
        title: 'Read Collection',
        params: [
            { field: 'id' },
            { field: 'name' },
            { field: 'mentionId' },
            { field: 'offset', type: 'number' },
            { field: 'limit', type: 'number' },
        ],
        props: [
            { field: 'id', required: true },
            { field: 'name' },
            { field: 'imageUrl' },
            { field: 'signedImageUrl' },
            { field: 'ownerId' },
            { field: 'description' },
            { field: 'organizationId' },
            { field: 'createdDateTime' },
            { field: 'typeId' },
            { field: 'isActive' }
        ]
    },
    'folder.read' : {
        title: 'Read Folder',
        params: [
            { field: 'id', required: true},
        ],
        props: [
            { field: 'id' },
            { field: 'name' },
            { field: 'description' },
        ]
    },
    'folder.update' : {
        title: 'Update Folder',
        params: [
            { field: 'id', required: true},
            { field: 'name', required: true}
        ]
    },
    'library.create': {
        title: 'Create a library',
        params: [
            { field: 'name', required: true },
            { field: 'applicationId' },
            { field: 'organizationId' },
            { field: 'applicationId' },
            { field: 'libraryTypeId' },
            { field: 'coverImageUrl' },
            { field: 'description' }
        ]
    },
    'library.update': {
        title: 'Update a library',
        params: [
            { field: 'id', required: true },
            { field: 'name' },
            { field: 'coverImageUrl' },
            { field: 'description' },
            { field: 'libraryTypeId' },
            { field: 'version' }
        ]
    },
    'library.delete': {
        title: 'Delete a library',
        params: [
            { field: 'id' }
        ]
    },
    'library.read': {
      title: 'Read Library',
      params: [
          { field: 'id' },
          { field: 'name' },
          { field: 'type' },
          { field: 'entityIdentifierTypeIds' },
          { field: 'includeOwnedOnly' },
          { field: 'orderBy' },
          { field: 'orderDirection' },
          { field: 'offset', type: 'number' },
          { field: 'limit', type: 'number' },
      ],
      props: [
          { field: 'id', required: true },
          { field: 'name' },
          { field: 'description' },
          { field: 'properties' },
          { field: 'organizationId' },
          { field: 'applicationId' },
          { field: 'libraryTypeId' },
          { field: 'libraryType' },
          { field: 'coverImageUrl' },
          { field: 'engineModels' },
          { field: 'configurations' },
          { field: 'dataset' },
          { field: 'entities' },
          { field: 'collaborators' },
          { field: 'summary' },
          { field: 'version' },
          { field: 'security' },
          { field: 'createdDateTime' },
          { field: 'createdBy' },
          { field: 'modifiedDateTime' },
          { field: 'modifiedBy' }
      ]
  },
}


module.exports = {
    Schemas
};
