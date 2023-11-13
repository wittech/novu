import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const UserSession = createParamDecorator((data, ctx) => {
  let req;
  if (ctx.getType() === 'graphql') {
    req = ctx.getArgs()[2].req;
  } else {
    req = ctx.switchToHttp().getRequest();
  }

  if (req.user) {
    /**
     * This helps with sentry and other tools that need to know who the user is based on `id` property.
     */
    req.user.id = req.user._id;
    req.user.username = (req.user.firstName || '').trim();
    req.user.domain = req.user.email?.split('@')[1];

    return req.user;
  }

  if (req.headers) {
    if (req.headers.authorization) {
      const tokenParts = req.headers.authorization.split(' ');
      if (tokenParts[0] !== 'Bearer')
        throw new UnauthorizedException('bad_token');
      if (!tokenParts[1]) throw new UnauthorizedException('bad_token');

      const user = jwt.decode(tokenParts[1]);

      return user;
    }
  }

  return null;
});
