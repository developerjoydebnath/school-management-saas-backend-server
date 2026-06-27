import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private async assertUniqueHeadTeacher(headTeacherId: string, currentId?: string) {
    if (!headTeacherId) return;

    const prisma = this.tenantConnection.getTenantClient();
    const existing = await prisma.department.findFirst({
      where: {
        headTeacherId,
        deletedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('This teacher is already head of another department');
    }
  }

  private mapData(dto: CreateDepartmentDto | UpdateDepartmentDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.nameBn !== undefined ? { nameBn: dto.nameBn || null } : {}),
      ...(dto.headTeacherId !== undefined ? { headTeacherId: dto.headTeacherId || null } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  private getListSelect() {
    return {
      id: true,
      name: true,
      nameBn: true,
      headTeacherId: true,
      isActive: true,
      headTeacher: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
        },
      },
    };
  }

  private getActiveListSelect() {
    return {
      id: true,
      name: true,
      nameBn: true,
    };
  }

  async create(dto: CreateDepartmentDto) {
    const prisma = this.tenantConnection.getTenantClient();
    
    if (dto.headTeacherId) {
      await this.assertUniqueHeadTeacher(dto.headTeacherId);
    }

    return prisma.department.create({
      data: {
        name: dto.name,
        nameBn: dto.nameBn || null,
        headTeacherId: dto.headTeacherId || null,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findActiveList() {
    const prisma = this.tenantConnection.getTenantClient();
    const items = await prisma.department.findMany({
      where: { isActive: true, deletedAt: null },
      select: this.getActiveListSelect(),
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active departments retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameBn: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: { name: 'asc' },
      }),
      prisma.department.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Departments retrieved successfully',
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const department = await prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        headTeacher: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
          }
        }
      }
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    if (dto.headTeacherId) {
      await this.assertUniqueHeadTeacher(dto.headTeacherId, id);
    }

    return prisma.department.update({
      where: { id },
      data: this.mapData(dto),
    });
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    return prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
