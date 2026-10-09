import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { InternalAuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): InternalAuthUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: InternalAuthUser }>();
    return request.user;
  },
);
