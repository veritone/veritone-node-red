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
            { field: 'id' },
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
    }
}




module.exports = {
    Schemas
};