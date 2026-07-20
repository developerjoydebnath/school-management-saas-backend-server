import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';

@Injectable()
export class SectionsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private mapData(dto: CreateSectionDto | UpdateSectionDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.bnName !== undefined ? { bnName: dto.bnName?.trim() || null } : {}),
      ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder ?? 0 } : {}),
      ...(dto.status !== undefined
        ? { status: this.normalizeStatus(dto.status) }
        : {}),
    };
  }

  private async assertUniqueName(name: string, currentId?: string) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const existing = await prisma.section.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        deletedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A section with this name already exists');
    }
  }

  private getListSelect() {
    return {
      id: true,
      name: true,
      bnName: true,
      code: true,
      sortOrder: true,
      status: true,
      createdAt: true,
    };
  }

  async create(dto: CreateSectionDto) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    await this.assertUniqueName(dto.name);

    const data = await prisma.section.create({
      data: {
        name: dto.name.trim(),
        bnName: dto.bnName?.trim() || null,
        code: dto.code?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        status: this.normalizeStatus(dto.status),
      },
      select: this.getListSelect(),
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Section created successfully',
      data,
      meta: null,
    };
  }

  async findActiveList() {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const sections = await prisma.section.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        bnName: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active sections retrieved successfully',
      data: sections.map((section: any) => ({
        id: section.id,
        value: section.id,
        label: section.name,
        name: section.name,
        bnName: section.bnName,
      })),
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { bnName: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      const statuses = String(query.status)
        .split(',')
        .map((status) => status.trim().toUpperCase())
        .filter(Boolean);
      if (statuses.length) {
        where.status = { in: statuses };
      }
    }

    const [items, total] = await Promise.all([
      prisma.section.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.section.count({ where }),
    ]);
    const totalCount = Number(total || 0);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Sections retrieved successfully',
      data: {
        items,
        meta: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const section = await prisma.section.findFirst({
      where: { id, deletedAt: null },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async update(id: string, dto: UpdateSectionDto) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    await this.findOne(id);
    if (dto.name) await this.assertUniqueName(dto.name, id);

    const data = await prisma.section.update({
      where: { id },
      data: this.mapData(dto),
      select: this.getListSelect(),
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Section updated successfully',
      data,
      meta: null,
    };
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    await this.findOne(id);

    const usage = await prisma.sessionClassSection.count({
      where: { sectionId: id, deletedAt: null },
    });
    if (usage > 0) {
      throw new BadRequestException(
        'This section is assigned to one or more session class setups',
      );
    }

    return prisma.section.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }
}
