import { INestApplication, Request } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '../app/shared/framework/types';

export const corsOptionsDelegate: Parameters<INestApplication['enableCors']>[0] = function (req: Request, callback) {
  const corsOptions: Parameters<typeof callback>[1] = {
    origin: false as boolean | string | string[],
    preflightContinue: false,
    maxAge: 86400,
    allowedHeaders: Object.values(HttpRequestHeaderKeysEnum),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };

  const host = (req.headers as any)?.host || '';

  if (['test', 'local'].includes(process.env.NODE_ENV) || isWidgetRoute(req.url) || isBlueprintRoute(req.url)) {
    corsOptions.origin = '*';
  } else {
    corsOptions.origin = [process.env.FRONT_BASE_URL];
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }

    const shouldDisableCorsForPreviewUrls =
      process.env.PR_PREVIEW_ROOT_URL &&
      process.env.NODE_ENV === 'dev' &&
      host.includes(process.env.PR_PREVIEW_ROOT_URL);

    if (shouldDisableCorsForPreviewUrls) {
      corsOptions.origin.push('*');
    }
  }

  callback(null as unknown as Error, corsOptions);
};

function isWidgetRoute(url: string) {
  return url.startsWith('/v1/widgets');
}

function isBlueprintRoute(url: string) {
  return url.startsWith('/v1/blueprints');
}
