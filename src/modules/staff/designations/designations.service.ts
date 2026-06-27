import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private mapData(dto: CreateDesignationDto | UpdateDesignationDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.nameBn !== undefined ? { nameBn: dto.nameBn || null } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.applicableTo !== undefined ? { applicableTo: dto.applicableTo } : {}),
      ...(dto.level !== undefined ? { level: dto.level } : {}),
      ...(dto.isHeadRole !== undefined ? { isHeadRole: dto.isHeadRole } : {}),
      ...(dto.isSystem !== undefined ? { isSystem: dto.isSystem } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  private getListSelect() {
    return {
      id: true,
      name: true,
      nameBn: true,
      category: true,
      level: true,
      isSystem: true,
      isActive: true,
      isHeadRole: true,
    };
  }

  private getActiveListSelect() {
    return {
      id: true,
      name: true,
      nameBn: true,
      category: true,
      level: true,
      isHeadRole: true,
    };
  }

  async create(dto: CreateDesignationDto) {
    const prisma = this.tenantConnection.getTenantClient();
    return prisma.designation.create({
      data: {
        name: dto.name,
        nameBn: dto.nameBn || null,
        category: dto.category,
        applicableTo: dto.applicableTo,
        level: dto.level ?? 0,
        isHeadRole: dto.isHeadRole ?? false,
        isSystem: dto.isSystem ?? true,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findActiveList() {
    const prisma = this.tenantConnection.getTenantClient();
    const items = await prisma.designation.findMany({
      where: { isActive: true, deletedAt: null },
      select: this.getActiveListSelect(),
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active designations retrieved successfully',
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

    if (query.category) {
      where.category = {
        in: String(query.category)
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [items, total] = await Promise.all([
      prisma.designation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: [{ level: 'desc' }, { name: 'asc' }],
      }),
      prisma.designation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Designations retrieved successfully',
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
    const designation = await prisma.designation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!designation) {
      throw new NotFoundException('Designation not found');
    }
    return designation;
  }

  async update(id: string, dto: UpdateDesignationDto) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id); // Ensure it exists

    return prisma.designation.update({
      where: { id },
      data: this.mapData(dto),
    });
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id); // Ensure it exists

    // Perform soft delete
    return prisma.designation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
