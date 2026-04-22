type ApiApp = {
  handle(request: Request): Promise<Response>;
};

let appPromise: Promise<ApiApp> | undefined;

async function getApp(): Promise<ApiApp> {
  if (!appPromise) {
    appPromise = import('../apps/api/dist/server.js').then(({ createDefaultApiApp }) =>
      createDefaultApiApp(),
    );
  }

  return appPromise;
}

function buildForwardedUrl(request: Request): URL {
  const incomingUrl = new URL(request.url);
  const forwardedUrl = new URL(request.url);
  const path = incomingUrl.searchParams.get('path');

  if (path === 'health') {
    forwardedUrl.pathname = '/health';
  } else if (path) {
    forwardedUrl.pathname = `/api/${path.replace(/^\/+/, '')}`;
  } else {
    forwardedUrl.pathname = '/api';
  }

  forwardedUrl.searchParams.delete('path');

  return forwardedUrl;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const app = await getApp();
    const forwardedUrl = buildForwardedUrl(request);
    const forwardedRequest = new Request(forwardedUrl, request);

    return app.handle(forwardedRequest);
  },
};
