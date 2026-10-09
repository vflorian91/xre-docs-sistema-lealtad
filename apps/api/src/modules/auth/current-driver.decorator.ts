import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DriverAuthUser } from './auth.types';

export const CurrentDriver = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DriverAuthUser | undefined => {
    const request = context.switchToHttp().getRequest<{ driver?: DriverAuthUser }>();
    return request.driver;
  },
);
