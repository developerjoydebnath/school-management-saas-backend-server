import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { UpsertSessionClassSetupDto } from './dto/session-class-section.dto';

@Injectable()
export class SessionClassSectionsService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private prisma: PrismaService,
  ) {}

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private splitIds(value?: string) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private async resolveSessionId(sessionId?: string) {
    if (sessionId) return sessionId;
    const selectedSessionId = this.tenantConnection.getAcademicSessionId?.();
    if (selectedSessionId) return selectedSessionId;

    const session = await this.prisma.academicSession.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
      orderBy: { year: 'desc' },
    });
    return session?.id || null;
  }

  private async assertSessionExists(sessionId: string) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) throw new BadRequestException('Session not found');
  }

  private async assertClassExists(classId: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const cls = await prisma.class.findFirst({
      where: { id: classId, deletedAt: null },
      select: { id: true },
    });
    if (!cls) throw new BadRequestException('Class not found');
  }

  private async assertSectionIds(sectionIds: string[]) {
    if (!sectionIds.length) return;
    const prisma = this.tenantConnection.getTenantClient();
    const sections = await prisma.section.findMany({
      where: { id: { in: sectionIds }, deletedAt: null },
      select: { id: true },
    });
    if (sections.length !== new Set(sectionIds).size) {
      throw new BadRequestException('One or more sections were not found');
    }
  }

  private async assertOptionalReferences(rows: any[]) {
    const prisma = this.tenantConnection.getTenantClient();
    const shiftIds = [...new Set(rows.map((row) => row.shiftId).filter(Boolean))];
    const roomIds = [...new Set(rows.map((row) => row.roomId).filter(Boolean))];

    const [shifts, rooms] = await Promise.all([
      shiftIds.length
        ? prisma.shift.findMany({
            where: { id: { in: shiftIds }, deletedAt: null },
            select: { id: true },
          })
        : Promise.resolve([]),
      roomIds.length
        ? prisma.classRoom.findMany({
            where: { id: { in: roomIds }, deletedAt: null },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);
    if (shifts.length !== shiftIds.length) {
      throw new BadRequestException('One or more shifts were not found');
    }
    if (rooms.length !== roomIds.length) {
      throw new BadRequestException('One or more class rooms were not found');
    }
  }

  private getInclude() {
    return {
      class: { select: { id: true, enName: true, bnName: true } },
      section: { select: { id: true, name: true, bnName: true } },
      shift: { select: { id: true, name: true } },
      room: { select: { id: true, roomNo: true, name: true, building: true, floor: true } },
    };
  }

  async upsertSetup(dto: UpsertSessionClassSetupDto) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    await Promise.all([
      this.assertSessionExists(dto.sessionId),
      this.assertClassExists(dto.classId),
    ]);

    const rows = dto.hasSections
      ? dto.sections || []
      : [{ ...(dto.classLevel || {}), sectionId: null }];

    if (dto.hasSections && !rows.length) {
      throw new BadRequestException('At least one section is required');
    }

    const sectionIds = rows.map((row: any) => row.sectionId).filter(Boolean);
    if (new Set(sectionIds).size !== sectionIds.length) {
      throw new BadRequestException('Duplicate sections are not allowed');
    }
    await Promise.all([
      this.assertSectionIds(sectionIds),
      this.assertOptionalReferences(rows),
    ]);

    const data = await prisma.$transaction(async (tx: any) => {
      await tx.sessionClassSection.updateMany({
        where: {
          sessionId: dto.sessionId,
          classId: dto.classId,
          deletedAt: null,
        },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      });

      await tx.sessionClassSection.createMany({
        data: rows.map((row: any) => ({
          sessionId: dto.sessionId,
          classId: dto.classId,
          sectionId: row.sectionId || null,
          capacity: row.capacity ?? null,
          shiftId: row.shiftId || null,
          roomId: row.roomId || null,
          status: this.normalizeStatus(row.status),
        })),
      });

      const items = await tx.sessionClassSection.findMany({
        where: {
          sessionId: dto.sessionId,
          classId: dto.classId,
          deletedAt: null,
        },
        include: this.getInclude(),
        orderBy: [{ createdAt: 'asc' }],
      });
      return items.sort((a: any, b: any) =>
        (a.section?.name || '').localeCompare(b.section?.name || ''),
      );
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Session class setup saved successfully',
      data,
      meta: null,
    };
  }

  async findSetup(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const sessionId = await this.resolveSessionId(query.sessionId);
    if (!sessionId) throw new BadRequestException('Session is required');
    if (!query.classId) throw new BadRequestException('Class is required');

    const items = await prisma.sessionClassSection.findMany({
      where: {
        sessionId,
        classId: query.classId,
        deletedAt: null,
      },
      include: this.getInclude(),
      orderBy: [{ createdAt: 'asc' }],
    });
    items.sort((a: any, b: any) =>
      (a.section?.name || '').localeCompare(b.section?.name || ''),
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Session class setup retrieved successfully',
      data: {
        sessionId,
        classId: query.classId,
        hasSections: items.some((item: any) => item.sectionId),
        items,
      },
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const sessionIds = this.splitIds(query.sessionId);
    const where: any = { deletedAt: null };
    if (sessionIds.length) where.sessionId = { in: sessionIds };
    if (query.classId) where.classId = { in: this.splitIds(query.classId) };
    if (query.status) {
      where.status = {
        in: this.splitIds(query.status).map((status) => status.toUpperCase()),
      };
    }

    const [items, total] = await Promise.all([
      prisma.sessionClassSection.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: this.getInclude(),
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.sessionClassSection.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Session class setups retrieved successfully',
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
    const prisma = this.tenantConnection.getTenantClient() as any;
    const item = await prisma.sessionClassSection.findFirst({
      where: { id, deletedAt: null },
      include: this.getInclude(),
    });
    if (!item) throw new NotFoundException('Session class setup not found');
    return item;
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient() as any;
    await this.findOne(id);
    return prisma.sessionClassSection.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }
}
