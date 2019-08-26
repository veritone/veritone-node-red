
const GetGraphqlEnv = () => {
    let { VERITONE_API_BASE_URL, API_TOKEN, GRAPHQL_TIMEOUT } = process.env;
    if (!VERITONE_API_BASE_URL.startsWith("http")) {
        VERITONE_API_BASE_URL = `https://${VERITONE_API_BASE_URL}`;
    }
    let URL = `${VERITONE_API_BASE_URL}/v3/graphql`;
    const TIMEOUT = +GRAPHQL_TIMEOUT || 30000;
    return { URL, API_TOKEN, TIMEOUT };
};

const GetNodeRedEnv = () => {
    let { NODE_INSTANCE_URL, NODE_INSTANCE_ID = '', AUTH_TOKEN = '' } = process.env;
    if (!NODE_INSTANCE_URL.startsWith('http')) {
        NODE_INSTANCE_URL = `https://${NODE_INSTANCE_URL}`;
    }
    const GetAbsUrl = uri => `${NODE_INSTANCE_URL}${uri}?authToken=${AUTH_TOKEN}`;
    return { NODE_INSTANCE_URL, NODE_INSTANCE_ID, AUTH_TOKEN, GetAbsUrl };
}

module.exports = {
    VeritoneGraphqlEnv: GetGraphqlEnv(),
    NodeRedEnv: GetNodeRedEnv()
};
