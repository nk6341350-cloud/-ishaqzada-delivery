import { handleApi } from './delivery-api.js';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return handleApi(request, env, path);
    return env.ASSETS.fetch(request);
  },
};
