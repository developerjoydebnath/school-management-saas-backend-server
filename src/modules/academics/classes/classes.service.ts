import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private prisma: PrismaService,
  ) {}

  private getInclude(sessionId?: string | null) {
    return {
      sessionSections: {
        where: {
          deletedAt: null,
          ...(sessionId ? { sessionId } : {}),
        },
        include: { section: true, room: true, shift: true },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private getListSelect() {
    return {
      id: true,
      enName: true,
      bnName: true,
      status: true,
      sessionSections: {
        where: { deletedAt: null },
        select: {
          id: true,
          sectionId: true,
          capacity: true,
          section: { select: { id: true, name: true, bnName: true } },
          room: { select: { id: true, roomNo: true, capacity: true } },
          shift: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private getActiveListSelect() {
    return {
      id: true,
      enName: true,
      bnName: true,
      status: true,
    };
  }

  private getSchemaName() {
    const schema = this.tenantConnection.getTenantSchema();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new BadRequestException('Invalid tenant schema');
    }
    return schema;
  }

  private quoteIdent(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private async hasTable(tableName: string) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const [result] = (await prisma.$queryRawUnsafe(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name = $2
        ) AS exists
      `,
      this.getSchemaName(),
      tableName,
    )) as Array<{ exists: boolean }>;

    return Boolean(result?.exists);
  }

  private async getFallbackSessionId() {
    const selectedSessionId = this.tenantConnection.getAcademicSessionId?.();
    if (selectedSessionId) return selectedSessionId;

    const session = await this.prisma.academicSession.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
      orderBy: { year: 'desc' },
    });

    return session?.id || null;
  }

  private async resolveSessionId(sessionId?: string) {
    if (sessionId) return sessionId;
    return this.getFallbackSessionId();
  }

  private normalizeClassWithSections(cls: any, sections: any[]) {
    return {
      ...cls,
      sections: sections
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
        .map((section) => ({
          id: section.id,
          name: section.name,
          classRoomId: section.classRoomId,
          shiftId: section.shiftId,
        })),
    };
  }

  private async applySessionSections(classes: any[], sessionId?: string | null) {
    if (!sessionId || classes.length === 0) return classes;
    const hasSessionClassSections = await this.hasTable(
      'session_class_sections',
    );
    const hasSections = await this.hasTable('sections');
    if (!hasSessionClassSections || !hasSections) return classes;

    const prisma = this.tenantConnection.getTenantClient() as any;
    const schema = this.quoteIdent(this.getSchemaName());
    const classIds = classes.map((item) => item.id).filter(Boolean);
    const mappings = (await prisma.$queryRawUnsafe(
      `
        SELECT
          scs.class_id::text AS "classId",
          scs.section_id::text AS "sectionId",
          s.name AS "sectionName",
          scs.room_id::text AS "classRoomId",
          scs.shift_id::text AS "shiftId"
        FROM ${schema}.session_class_sections scs
        LEFT JOIN ${schema}.sections s ON s.id = scs.section_id
        WHERE scs.session_id = $1::uuid
          AND scs.class_id = ANY($2::uuid[])
          AND scs.deleted_at IS NULL
          AND scs.status = 'ACTIVE'
        ORDER BY scs.class_id ASC, COALESCE(s.sort_order, 0) ASC, s.name ASC
      `,
      sessionId,
      classIds,
    )) as Array<{
      classId: string;
      sectionId: string | null;
      sectionName: string | null;
      classRoomId: string | null;
      shiftId: string | null;
    }>;

    if (!mappings.length) return classes;

    const mappingsByClass = new Map<string, any[]>();
    for (const mapping of mappings) {
      const current = mappingsByClass.get(mapping.classId) || [];
      current.push(mapping);
      mappingsByClass.set(mapping.classId, current);
    }

    return classes.map((cls) => {
      const classMappings = mappingsByClass.get(cls.id);
      if (!classMappings) return cls;
      const mappedSections = classMappings
        .filter((mapping) => mapping.sectionId)
        .map((mapping) => ({
          id: mapping.sectionId,
          name: mapping.sectionName,
          classRoomId: mapping.classRoomId,
          shiftId: mapping.shiftId,
        }))
        .filter(Boolean);
      return this.normalizeClassWithSections(cls, mappedSections);
    });
  }

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
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
      throw new ConflictException(
        'A class with this English name already exists',
      );
    }
  }

  async create(createClassDto: CreateClassDto) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.assertUniqueName(createClassDto.enName);

    const created = await prisma.class.create({
      data: {
        enName: createClassDto.enName,
        bnName: createClassDto.bnName || null,
        status: this.normalizeStatus(createClassDto.status),
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

  async findActiveList(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const sessionId = await this.resolveSessionId(query.sessionId);
    const items = await prisma.class.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        enName: true,
        bnName: true,
        status: true,
      },
      orderBy: { enName: 'asc' },
    });
    const data = await this.applySessionSections(items, sessionId);

    return {
      success: true,
      statusCode: 200,
      message: 'Active classes retrieved successfully',
      data,
      meta: null,
    };
  }

  async findActiveSections(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const classId = query.classId;
    if (!classId) {
      throw new BadRequestException('Class is required');
    }

    const sessionId = await this.resolveSessionId(query.sessionId);

    const mappings =
      sessionId
        ? await prisma.sessionClassSection.findMany({
            where: {
              sessionId,
              classId,
              deletedAt: null,
            },
            select: {
              id: true,
              sectionId: true,
              roomId: true,
              shiftId: true,
              status: true,
              section: {
                select: {
                  id: true,
                  name: true,
                  bnName: true,
                  sortOrder: true,
                  status: true,
                  deletedAt: true,
                },
              },
            },
            orderBy: [{ createdAt: 'asc' }],
          })
        : [];

    const data = mappings
      .filter((mapping: any) => mapping.sectionId && mapping.section)
      .filter(
        (mapping: any) =>
          !mapping.section.deletedAt &&
          String(mapping.status || 'ACTIVE').toUpperCase() === 'ACTIVE' &&
          String(mapping.section.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
      )
      .sort(
        (a: any, b: any) =>
          Number(a.section.sortOrder || 0) - Number(b.section.sortOrder || 0) ||
          String(a.section.name || '').localeCompare(
            String(b.section.name || ''),
          ),
      )
      .map((mapping: any) => ({
        id: mapping.section.id,
        label: mapping.section.name,
        value: mapping.section.id,
        name: mapping.section.name,
        bnName: mapping.section.bnName,
        classRoomId: mapping.roomId,
        shiftId: mapping.shiftId,
      }));

    return {
      success: true,
      statusCode: 200,
      message: 'Active sections retrieved successfully',
      data,
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
    if (andFilters.length) {
      where.AND = andFilters;
    }

    const [items, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
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

  async findOne(id: string, query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const sessionId = await this.resolveSessionId(query.sessionId);
    const cls = await prisma.class.findFirst({
      where: { id, deletedAt: null },
      include: this.getInclude(sessionId),
    });
    if (!cls) {
      throw new NotFoundException('Class not found');
    }
    return cls;
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    if (updateClassDto.enName) {
      await this.assertUniqueName(updateClassDto.enName, id);
    }
    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...(updateClassDto.enName !== undefined
          ? { enName: updateClassDto.enName }
          : {}),
        ...(updateClassDto.bnName !== undefined
          ? { bnName: updateClassDto.bnName || null }
          : {}),
        ...(updateClassDto.status !== undefined
          ? { status: this.normalizeStatus(updateClassDto.status) }
          : {}),
      },
      include: this.getInclude(),
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
        sessionSections: {
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
