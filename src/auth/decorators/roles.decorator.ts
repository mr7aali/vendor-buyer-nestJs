import { SetMetadata } from '@nestjs/common';
import { UserType } from '../dto/register.dto';

export const Roles = (...roles: UserType[]) => SetMetadata('roles', roles);
