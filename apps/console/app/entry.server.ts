import handleRequestCloudflarefrom from './entry.server.cloudflare'
import handleRequestNode from './entry.server.node'

const IS_EXPRESS = import.meta.env.BUILD_RUNTIME === 'express'

const handleRequest = IS_EXPRESS
  ? handleRequestNode
  : handleRequestCloudflarefrom

export default handleRequest
