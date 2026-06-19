import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/cores/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const existing = await this.prisma.client.permission.findUnique({
      where: { permissionKey: createPermissionDto.permissionKey },
    });

    if (existing) {
      throw new ConflictException('A permission with this key already exists');
    }

    return this.prisma.client.permission.create({
      data: {
        permissionName: createPermissionDto.permissionName,
        groupName: createPermissionDto.groupName,
        permissionKey: createPermissionDto.permissionKey,
        moduleName: createPermissionDto.moduleName || [],
      },
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 1000,
    search?: string,
    modules?: string[],
  ) {
    const where: any = {};
    if (search) {
      where.OR = [
        { permissionName: { contains: search, mode: 'insensitive' } },
        { permissionKey: { contains: search, mode: 'insensitive' } },
        { groupName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (modules && modules.length > 0) {
      where.moduleName = { hasSome: modules };
    }

    const [items, total] = await Promise.all([
      this.prisma.client.permission.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { groupName: 'asc' },
      }),
      this.prisma.client.permission.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Permissions retrieved successfully',
      data: {
        items,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: number) {
    const permission = await this.prisma.client.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async update(id: number, updatePermissionDto: UpdatePermissionDto) {
    await this.findOne(id); // Ensure exists

    if (updatePermissionDto.permissionKey) {
      const existing = await this.prisma.client.permission.findUnique({
        where: { permissionKey: updatePermissionDto.permissionKey },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A permission with this key already exists',
        );
      }
    }

    return this.prisma.client.permission.update({
      where: { id },
      data: updatePermissionDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Ensure exists

    return this.prisma.client.permission.delete({
      where: { id },
    });
  }
}
