import cache from '../cache/cacheStore.js'

export const cacheMiddleware = (req, res, next) => {
 
  const key = req.originalUrl

  const cachedData = cache.get(key)

  if (cachedData) {
    console.log('CACHE HIT:', key)
    return res.json(cachedData)
  }

  console.log('CACHE MISS:', key)

  
  
  const originalJson = res.json.bind(res)
  res.json = (data) => {
    cache.set(key, data)
    return originalJson(data)
  }

  next()
}