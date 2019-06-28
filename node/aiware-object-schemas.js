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
    }
}




module.exports = {
    Schemas
};