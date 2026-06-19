import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private tenantConnection: TenantConnectionService) {}

  async create(createRoleDto: CreateRoleDto) {
    const prisma = this.tenantConnection.getTenantClient();

    const existing = await prisma.tenantRole.findFirst({
      where: { name: createRoleDto.name, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    return prisma.tenantRole.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: createRoleDto.permissions || [],
        status: createRoleDto.status || 'ACTIVE',
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const prisma = this.tenantConnection.getTenantClient();

    const where: any = { deletedAt: null };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.tenantRole.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.tenantRole.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
      success: true,
      statusCode: 200,
      message: 'Roles retrieved successfully',
      data: {
        items,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNextPage: Number(page) < totalPages,
          hasPreviousPage: Number(page) > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const role = await prisma.tenantRole.findFirst({
      where: { id, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const prisma = this.tenantConnection.getTenantClient();
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new ConflictException('System roles cannot be modified');
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existing = await prisma.tenantRole.findFirst({
        where: { name: updateRoleDto.name, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    return prisma.tenantRole.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }

    return prisma.tenantRole.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }
}
