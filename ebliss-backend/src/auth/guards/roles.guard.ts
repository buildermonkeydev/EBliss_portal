// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log(' RolesGuard - Required Roles:', requiredRoles);

    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('No roles required - allowing access');
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    console.log(' User from request:', user);
    console.log(' User role:', user?.role);

    if (!user) {
      console.log(' No user found in request');
      return false;
    }

    const hasRole = requiredRoles.some((role) => {
      const match = user.role === role;
      console.log(`Comparing required: "${role}" with user: "${user.role}" = ${match}`);
      return match;
    });

    console.log(hasRole ? 'Access granted' : ' Access denied');
    return hasRole;
  }
}