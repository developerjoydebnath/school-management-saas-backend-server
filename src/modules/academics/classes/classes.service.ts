import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateClassDto, SectionDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private getInclude() {
    return {
      classRoom: true,
      shift: true,
      sections: {
        where: { deletedAt: null },
        include: { classRoom: true, shift: true },
        orderBy: { name: 'asc' as const },
      },
    };
  }

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private hasSections(sections?: SectionDto[]) {
    return Array.isArray(sections) && sections.length > 0;
  }

  private async assertShiftExists(shiftId?: string) {
    if (!shiftId) return;
    const prisma = this.tenantConnection.getTenantClient();
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, deletedAt: null },
      select: { id: true },
    });
    if (!shift) {
      throw new BadRequestException('Shift not found');
    }
  }

  private async assertClassRoomExists(classRoomId?: string) {
    if (!classRoomId) return;
    const prisma = this.tenantConnection.getTenantClient();
    const room = await prisma.classRoom.findFirst({
      where: { id: classRoomId, deletedAt: null },
      select: { id: true },
    });
    if (!room) {
      throw new BadRequestException('Class room not found');
    }
  }

  private async assertSectionReferencesExist(sections?: SectionDto[]) {
    if (!this.hasSections(sections)) return;
    const uniqueShiftIds = [...new Set(sections!.map((section) => section.shiftId))];
    const uniqueRoomIds = [...new Set(sections!.map((section) => section.classRoomId))];
    const prisma = this.tenantConnection.getTenantClient();
    const [shifts, rooms] = await Promise.all([
      prisma.shift.findMany({
        where: { id: { in: uniqueShiftIds }, deletedAt: null },
        select: { id: true },
      }),
      prisma.classRoom.findMany({
        where: { id: { in: uniqueRoomIds }, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (shifts.length !== uniqueShiftIds.length) {
      throw new BadRequestException('One or more section shifts were not found');
    }
    if (rooms.length !== uniqueRoomIds.length) {
      throw new BadRequestException('One or more section class rooms were not found');
    }
  }

  private validateClassDefaults(dto: CreateClassDto | UpdateClassDto) {
    if (this.hasSections(dto.sections)) return;
    if (!dto.classRoomId || !dto.shiftId) {
      throw new BadRequestException(
        'Class room and shift are required when no sections are provided',
      );
    }
  }

  private validateSectionNames(sections?: SectionDto[]) {
    if (!this.hasSections(sections)) return;
    const normalizedNames = sections!.map((section) =>
      section.name.trim().toLowerCase(),
    );
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      throw new BadRequestException('Section names must be unique within a class');
    }
  }

  private async assertUniqueName(enName: string, currentId?: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const existing = await prisma.class.findFirst({
      where: {
        enName: { equals: enName, mode: 'insensitive' },
        deletedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A class with this English name already exists');
    }
  }

  private mapSectionCreate(section: SectionDto) {
    return {
      name: section.name,
      classRoomId: section.classRoomId,
      shiftId: section.shiftId,
    };
  }

  async create(createClassDto: CreateClassDto) {
    const prisma = this.tenantConnection.getTenantClient();
    this.validateClassDefaults(createClassDto);
    this.validateSectionNames(createClassDto.sections);
    await this.assertUniqueName(createClassDto.enName);

    if (this.hasSections(createClassDto.sections)) {
      await this.assertSectionReferencesExist(createClassDto.sections);
    } else {
      await Promise.all([
        this.assertShiftExists(createClassDto.shiftId),
        this.assertClassRoomExists(createClassDto.classRoomId),
      ]);
    }

    const hasSections = this.hasSections(createClassDto.sections);
    const created = await prisma.class.create({
      data: {
        enName: createClassDto.enName,
        bnName: createClassDto.bnName || null,
        classRoomId: hasSections ? null : createClassDto.classRoomId,
        shiftId: hasSections ? null : createClassDto.shiftId,
        status: this.normalizeStatus(createClassDto.status),
        ...(hasSections
          ? {
              sections: {
                create: createClassDto.sections!.map((section) =>
                  this.mapSectionCreate(section),
                ),
              },
            }
          : {}),
      },
      include: this.getInclude(),
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Class created successfully',
      data: created,
      meta: null,
    };
  }

  async findActiveList() {
    const prisma = this.tenantConnection.getTenantClient();
    const items = await prisma.class.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: this.getInclude(),
      orderBy: { enName: 'asc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active classes retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };
    const andFilters: any[] = [];

    if (query.search) {
      andFilters.push({
        OR: [
          { enName: { contains: query.search, mode: 'insensitive' } },
          { bnName: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.status) {
      where.status = {
        in: String(query.status)
          .split(',')
          .map((status) => status.trim().toUpperCase())
          .filter(Boolean),
      };
    }
    if (query.shiftId) {
      const shiftIds = String(query.shiftId)
        .split(',')
        .map((shiftId) => shiftId.trim())
        .filter(Boolean);
      andFilters.push({
        OR: [
          { shiftId: { in: shiftIds } },
          { sections: { some: { shiftId: { in: shiftIds }, deletedAt: null } } },
        ],
      });
    }
    if (query.classRoomId) {
      const classRoomIds = String(query.classRoomId)
        .split(',')
        .map((classRoomId) => classRoomId.trim())
        .filter(Boolean);
      andFilters.push({
        OR: [
          { classRoomId: { in: classRoomIds } },
          { sections: { some: { classRoomId: { in: classRoomIds }, deletedAt: null } } },
        ],
      });
    }
    if (andFilters.length) {
      where.AND = andFilters;
    }

    const [items, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: this.getInclude(),
        orderBy: { enName: 'asc' },
      }),
      prisma.class.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Classes retrieved successfully',
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
    const cls = await prisma.class.findFirst({
      where: { id, deletedAt: null },
      include: this.getInclude(),
    });
    if (!cls) {
      throw new NotFoundException('Class not found');
    }
    return cls;
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    const prisma = this.tenantConnection.getTenantClient();
    const existingClass = await this.findOne(id);
    if (
      updateClassDto.sections !== undefined ||
      updateClassDto.classRoomId !== undefined ||
      updateClassDto.shiftId !== undefined
    ) {
      this.validateClassDefaults({
        ...updateClassDto,
        classRoomId: updateClassDto.classRoomId ?? existingClass.classRoomId ?? undefined,
        shiftId: updateClassDto.shiftId ?? existingClass.shiftId ?? undefined,
      });
    }
    this.validateSectionNames(updateClassDto.sections);

    if (updateClassDto.enName) {
      await this.assertUniqueName(updateClassDto.enName, id);
    }
    if (this.hasSections(updateClassDto.sections)) {
      await this.assertSectionReferencesExist(updateClassDto.sections);
    } else {
      await Promise.all([
        updateClassDto.shiftId ? this.assertShiftExists(updateClassDto.shiftId) : Promise.resolve(),
        updateClassDto.classRoomId
          ? this.assertClassRoomExists(updateClassDto.classRoomId)
          : Promise.resolve(),
      ]);
    }

    const hasSections = this.hasSections(updateClassDto.sections);
    const updated = await prisma.$transaction(async (tx) => {
      if (updateClassDto.sections !== undefined) {
        await tx.section.updateMany({
          where: { classId: id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            status: 'INACTIVE',
          },
        });
      }

      return tx.class.update({
        where: { id },
        data: {
          ...(updateClassDto.enName !== undefined ? { enName: updateClassDto.enName } : {}),
          ...(updateClassDto.bnName !== undefined ? { bnName: updateClassDto.bnName || null } : {}),
          ...(updateClassDto.status !== undefined
            ? { status: this.normalizeStatus(updateClassDto.status) }
            : {}),
          ...(updateClassDto.sections !== undefined ||
          updateClassDto.classRoomId !== undefined
            ? {
                classRoomId: hasSections
                  ? null
                  : updateClassDto.classRoomId ?? existingClass.classRoomId,
              }
            : {}),
          ...(updateClassDto.sections !== undefined ||
          updateClassDto.shiftId !== undefined
            ? {
                shiftId: hasSections
                  ? null
                  : updateClassDto.shiftId ?? existingClass.shiftId,
              }
            : {}),
          ...(hasSections
            ? {
                sections: {
                  create: updateClassDto.sections!.map((section) =>
                    this.mapSectionCreate(section),
                  ),
                },
              }
            : {}),
        },
        include: this.getInclude(),
      });
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Class updated successfully',
      data: updated,
      meta: null,
    };
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    return prisma.class.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
        sections: {
          updateMany: {
            where: { deletedAt: null },
            data: {
              deletedAt: new Date(),
              status: 'INACTIVE',
            },
          },
        },
      },
    });
  }
}
