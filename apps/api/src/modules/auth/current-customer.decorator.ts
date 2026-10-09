import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerAuthUser } from './auth.types';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerAuthUser | undefined => {
    const request = context.switchToHttp().getRequest<{ customer?: CustomerAuthUser }>();
    return request.customer;
  },
);
