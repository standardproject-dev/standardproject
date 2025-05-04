import handleRequestCloudflare, { isSupport } from './entry.server.cloudflare'
import handleRequestNode from './entry.server.node'

const handleRequest = isSupport() ? handleRequestCloudflare : handleRequestNode
export default handleRequest
