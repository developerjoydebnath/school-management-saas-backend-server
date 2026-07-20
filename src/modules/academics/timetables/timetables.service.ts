import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { PdfService } from 'src/modules/payments/pdf.service';
import { SaveTimetableDto } from './dto/timetable.dto';
import { getTimetablePdfTemplate } from './templates/timetable-pdf.template';

@Injectable()
export class TimetablesService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}

  private getSelect() {
    return {
      id: true,
      sessionId: true,
      classId: true,
      sectionId: true,
      title: true,
      days: true,
      columns: true,
      cells: true,
      version: true,
      status: true,
      updatedAt: true,
    };
  }

  private getTargetSectionIds(dto: SaveTimetableDto) {
    return [...new Set(dto.sectionIds?.filter(Boolean) || [])];
  }

  private normalizeCells(cells: Record<string, unknown>) {
    return cells || {};
  }

  private normalizeForCompare(value: unknown) {
    return JSON.stringify(value || null);
  }

  private getEnglishName(name: string | { en?: string; bn?: string } | null) {
    if (!name) return '';
    return typeof name === 'string' ? name : name.en || '';
  }

  private getTargetSchoolName() {
    const schemaName = this.tenantConnection.getTenantSchema();
    if (schemaName === 'public') {
      return Promise.resolve({
        schoolName: 'NEXA School Management System',
        logoPlaceholder: null,
        logoUrl: null,
      });
    }

    return this.prisma.client.school.findFirst({
      where: { schoolSlug: schemaName, deletedAt: null },
      select: {
        schoolName: true,
        logoPlaceholder: true,
        logoUrl: true,
      },
    });
  }

  private parseSectionIds(sectionIds?: string) {
    return [
      ...new Set(
        (sectionIds || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
  }

  private parseList(value?: string) {
    return [
      ...new Set(
        (value || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
  }

  private parsePage(value?: string) {
    const page = Number(value || 1);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  private parseLimit(value?: string) {
    const limit = Number(value || 10);
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10;
  }

  private parseDateStart(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private parseDateEnd(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private async getSessionNameMap(sessionIds: string[]) {
    const uniqueIds = [...new Set(sessionIds.filter(Boolean))];
    if (!uniqueIds.length) return new Map<string, string>();

    const sessions = await this.prisma.client.academicSession.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    });

    return new Map(sessions.map((session) => [session.id, session.name]));
  }

  private async getFallbackSessionId() {
    const selectedSessionId = this.tenantConnection.getAcademicSessionId();
    if (selectedSessionId) return selectedSessionId;

    const activeSession = await this.prisma.client.academicSession.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
      orderBy: { year: 'desc' },
    });

    return activeSession?.id || null;
  }

  private async resolveSingleSessionId(sessionId?: string) {
    if (sessionId) return sessionId;
    return this.getFallbackSessionId();
  }

  private async resolveHistorySessionIds(sessionId?: string) {
    const explicitSessionIds = this.parseList(sessionId);
    if (explicitSessionIds.length) return explicitSessionIds;

    const fallbackSessionId = await this.getFallbackSessionId();
    return fallbackSessionId ? [fallbackSessionId] : [];
  }

  private extractAssignmentIds(cells: Record<string, unknown>) {
    const subjectIds = new Set<string>();
    const teacherIds = new Set<string>();
    const classRoomIds = new Set<string>();

    Object.values(cells || {}).forEach((value) => {
      if (!Array.isArray(value)) return;
      value.forEach((assignment: any) => {
        if (assignment?.subjectId) subjectIds.add(String(assignment.subjectId));
        if (assignment?.teacherId) teacherIds.add(String(assignment.teacherId));
        if (assignment?.classRoomId)
          classRoomIds.add(String(assignment.classRoomId));
      });
    });

    return {
      subjectIds: [...subjectIds],
      teacherIds: [...teacherIds],
      classRoomIds: [...classRoomIds],
    };
  }

  private async assertReferences(dto: SaveTimetableDto) {
    const tenant = this.tenantConnection.getTenantClient();
    const sectionIds = this.getTargetSectionIds(dto);
    const cells = this.normalizeCells(dto.cells);
    const { subjectIds, teacherIds, classRoomIds } =
      this.extractAssignmentIds(cells);

    const [session, cls, sections, subjects, teachers, rooms] =
      await Promise.all([
        this.prisma.client.academicSession.findFirst({
          where: { id: dto.sessionId, status: 'ACTIVE' },
          select: { id: true },
        }),
        tenant.class.findFirst({
          where: { id: dto.classId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        }),
        sectionIds.length
          ? tenant.sessionClassSection.findMany({
              where: {
                sessionId: dto.sessionId,
                classId: dto.classId,
                sectionId: { in: sectionIds },
                deletedAt: null,
                status: 'ACTIVE',
              },
              select: { sectionId: true },
            })
          : Promise.resolve([]),
        subjectIds.length
          ? tenant.subject.findMany({
              where: {
                id: { in: subjectIds },
                deletedAt: null,
                status: 'ACTIVE',
              },
              select: { id: true },
            })
          : Promise.resolve([]),
        teacherIds.length
          ? tenant.teacher.findMany({
              where: {
                id: { in: teacherIds },
                deletedAt: null,
                status: 'active',
              },
              select: { id: true },
            })
          : Promise.resolve([]),
        classRoomIds.length
          ? tenant.classRoom.findMany({
              where: {
                id: { in: classRoomIds },
                deletedAt: null,
                status: 'ACTIVE',
              },
              select: { id: true },
            })
          : Promise.resolve([]),
      ]);

    if (!session) throw new BadRequestException('Academic session not found');
    if (!cls) throw new BadRequestException('Class not found');
    const availableSectionIds = new Set(
      sections.map((section: any) => section.sectionId).filter(Boolean),
    );
    if (availableSectionIds.size !== sectionIds.length) {
      throw new BadRequestException(
        'One or more selected sections were not found',
      );
    }
    if (subjects.length !== subjectIds.length) {
      throw new BadRequestException(
        'One or more assigned subjects were not found',
      );
    }
    if (teachers.length !== teacherIds.length) {
      throw new BadRequestException(
        'One or more assigned teachers were not found',
      );
    }
    if (rooms.length !== classRoomIds.length) {
      throw new BadRequestException(
        'One or more assigned rooms were not found',
      );
    }
  }

  async findCurrent(query: {
    sessionId?: string;
    classId?: string;
    sectionId?: string;
  }) {
    const sessionId = await this.resolveSingleSessionId(query.sessionId);

    if (!sessionId || !query.classId) {
      throw new BadRequestException('Session and class are required');
    }

    const prisma = this.tenantConnection.getTenantClient();
    const timetable = await prisma.timetable.findFirst({
      where: {
        sessionId,
        classId: query.classId,
        sectionId: query.sectionId || null,
        deletedAt: null,
      },
      select: this.getSelect(),
      orderBy: { updatedAt: 'desc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Timetable retrieved successfully',
      data: timetable,
      meta: null,
    };
  }

  async save(dto: SaveTimetableDto, savedBy?: string) {
    await this.assertReferences(dto);

    const prisma = this.tenantConnection.getTenantClient();
    const sectionIds = this.getTargetSectionIds(dto);
    const targets = sectionIds.length ? sectionIds : [null];
    const cells = this.normalizeCells(dto.cells);

    const saved = await prisma.$transaction(async (tx) => {
      const items: any[] = [];

      for (const sectionId of targets) {
        const existing = await tx.timetable.findFirst({
          where: {
            sessionId: dto.sessionId,
            classId: dto.classId,
            sectionId,
            deletedAt: null,
          },
          select: { id: true, version: true },
        });
        const version = existing ? existing.version + 1 : 1;
        const data = {
          sessionId: dto.sessionId,
          classId: dto.classId,
          sectionId,
          title: dto.title || null,
          days: dto.days,
          columns: dto.columns as any,
          cells: cells as any,
          version,
          status: 'ACTIVE',
        };

        const timetable = existing
          ? await tx.timetable.update({
              where: { id: existing.id },
              data,
              select: this.getSelect(),
            })
          : await tx.timetable.create({
              data,
              select: this.getSelect(),
            });

        await tx.timetableHistory.create({
          data: {
            timetableId: timetable.id,
            sessionId: timetable.sessionId,
            classId: timetable.classId,
            sectionId: timetable.sectionId,
            title: timetable.title,
            days: timetable.days as any,
            columns: timetable.columns as any,
            cells: timetable.cells as any,
            version: timetable.version,
            savedBy,
          },
        });

        items.push(timetable);
      }

      return items;
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Timetable saved successfully',
      data: saved,
      meta: null,
    };
  }

  async findHistory(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const timetable = await prisma.timetable.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');

    const items = await prisma.timetableHistory.findMany({
      where: { timetableId: id },
      orderBy: { savedAt: 'desc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Timetable history retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findHistoryList(query: {
    page?: string;
    limit?: string;
    sessionId?: string;
    classId?: string;
    sectionId?: string;
    savedFrom?: string;
    savedTo?: string;
  }) {
    const prisma = this.tenantConnection.getTenantClient();
    const page = this.parsePage(query.page);
    const limit = this.parseLimit(query.limit);
    const skip = (page - 1) * limit;
    const savedFrom = this.parseDateStart(query.savedFrom);
    const savedTo = this.parseDateEnd(query.savedTo);
    const sessionIds = await this.resolveHistorySessionIds(query.sessionId);

    const where: any = {
      ...(sessionIds.length === 1 ? { sessionId: sessionIds[0] } : {}),
      ...(sessionIds.length > 1 ? { sessionId: { in: sessionIds } } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId
        ? query.sectionId === 'class'
          ? { sectionId: null }
          : { sectionId: query.sectionId }
        : {}),
      ...(savedFrom || savedTo
        ? {
            savedAt: {
              ...(savedFrom ? { gte: savedFrom } : {}),
              ...(savedTo ? { lte: savedTo } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.timetableHistory.findMany({
        where,
        select: {
          id: true,
          timetableId: true,
          sessionId: true,
          classId: true,
          sectionId: true,
          version: true,
          changeType: true,
          savedAt: true,
          timetable: {
            select: {
              class: { select: { id: true, enName: true } },
              section: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timetableHistory.count({ where }),
    ]);

    const sessionMap = await this.getSessionNameMap(
      items.map((item) => item.sessionId),
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      statusCode: 200,
      message: 'Timetable history retrieved successfully',
      data: {
        items: items.map((item) => ({
          id: item.id,
          timetableId: item.timetableId,
          sessionId: item.sessionId,
          sessionName: sessionMap.get(item.sessionId) || null,
          classId: item.classId,
          className: item.timetable?.class?.enName || null,
          sectionId: item.sectionId,
          sectionName: item.timetable?.section?.name || null,
          version: item.version,
          changeType: item.changeType,
          savedAt: item.savedAt,
        })),
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

  async findHistoryOne(historyId: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const item = await prisma.timetableHistory.findFirst({
      where: { id: historyId },
      select: {
        id: true,
        timetableId: true,
        sessionId: true,
        classId: true,
        sectionId: true,
        title: true,
        days: true,
        columns: true,
        cells: true,
        version: true,
        changeType: true,
        savedBy: true,
        savedAt: true,
        timetable: {
          select: {
            class: { select: { id: true, enName: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Timetable history not found');

    const sessionMap = await this.getSessionNameMap([item.sessionId]);

    return {
      success: true,
      statusCode: 200,
      message: 'Timetable history retrieved successfully',
      data: {
        id: item.id,
        timetableId: item.timetableId,
        sessionId: item.sessionId,
        sessionName: sessionMap.get(item.sessionId) || null,
        classId: item.classId,
        className: item.timetable?.class?.enName || null,
        sectionId: item.sectionId,
        sectionName: item.timetable?.section?.name || null,
        title: item.title,
        days: item.days,
        columns: item.columns,
        cells: item.cells,
        version: item.version,
        changeType: item.changeType,
        savedBy: item.savedBy,
        savedAt: item.savedAt,
      },
      meta: null,
    };
  }

  async findTeachersBySubject(subjectId: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const teachers = await prisma.teacher.findMany({
      where: { deletedAt: null, status: 'active' },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        primarySubjectId: true,
        specializationSubjects: true,
        primarySubject: {
          select: {
            id: true,
            enName: true,
            bnName: true,
            code: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const getSpecializationSubjectIds = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];

    const items = teachers.filter((teacher) => {
      const specializationSubjects = getSpecializationSubjectIds(
        teacher.specializationSubjects,
      );
      return (
        teacher.primarySubjectId === subjectId ||
        specializationSubjects.includes(subjectId)
      );
    });

    const specializedSubjectIds = [
      ...new Set(
        items
          .flatMap((teacher) =>
            getSpecializationSubjectIds(teacher.specializationSubjects),
          )
          .filter(Boolean),
      ),
    ];
    const specializedSubjects = specializedSubjectIds.length
      ? await prisma.subject.findMany({
          where: {
            id: { in: specializedSubjectIds },
            deletedAt: null,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            enName: true,
            bnName: true,
            code: true,
          },
        })
      : [];
    const specializedSubjectMap = new Map(
      specializedSubjects.map((subject) => [subject.id, subject]),
    );
    const enrichedItems = items.map((teacher) => ({
      ...teacher,
      specializationSubjectItems: getSpecializationSubjectIds(
        teacher.specializationSubjects,
      )
        .map((id) => specializedSubjectMap.get(id))
        .filter(Boolean),
    }));

    return {
      success: true,
      statusCode: 200,
      message: 'Subject teachers retrieved successfully',
      data: enrichedItems,
      meta: null,
    };
  }

  async generatePrintPdf(query: {
    sessionId?: string;
    classId?: string;
    sectionIds?: string;
    locale?: string;
  }): Promise<Buffer> {
    const sessionId = await this.resolveSingleSessionId(query.sessionId);

    if (!sessionId || !query.classId) {
      throw new BadRequestException('Session and class are required');
    }

    const prisma = this.tenantConnection.getTenantClient();
    const sectionIds = this.parseSectionIds(query.sectionIds);
    const targetSectionIds = sectionIds.length ? sectionIds : [null];

    const [session, cls, selectedSections, school] = await Promise.all([
      this.prisma.client.academicSession.findFirst({
        where: { id: sessionId },
        select: { id: true, name: true },
      }),
      prisma.class.findFirst({
        where: { id: query.classId, deletedAt: null },
        select: { id: true, enName: true, bnName: true },
      }),
      sectionIds.length
        ? prisma.sessionClassSection.findMany({
            where: {
              sessionId,
              classId: query.classId,
              sectionId: { in: sectionIds },
              deletedAt: null,
              status: 'ACTIVE',
            },
            select: { section: { select: { id: true, name: true } } },
          })
        : Promise.resolve([] as any[]),
      this.getTargetSchoolName(),
    ]);

    if (!session) throw new BadRequestException('Academic session not found');
    if (!cls) throw new BadRequestException('Class not found');
    const selectedSectionItems = selectedSections
      .map((item: any) => item.section)
      .filter(Boolean);
    if (selectedSectionItems.length !== sectionIds.length) {
      throw new BadRequestException(
        'One or more selected sections were not found',
      );
    }

    const timetables = await prisma.timetable.findMany({
      where: {
        sessionId,
        classId: query.classId,
        deletedAt: null,
        ...(sectionIds.length
          ? { sectionId: { in: sectionIds } }
          : { sectionId: null }),
      },
      select: this.getSelect(),
      orderBy: { updatedAt: 'desc' },
    });

    const latestByTarget = new Map<string, any>();
    for (const timetable of timetables) {
      const key = timetable.sectionId || 'class';
      if (!latestByTarget.has(key)) latestByTarget.set(key, timetable);
    }

    const orderedTimetables = targetSectionIds.map((sectionId) =>
      latestByTarget.get(sectionId || 'class'),
    );

    if (orderedTimetables.some((timetable) => !timetable)) {
      throw new NotFoundException(
        'Timetable not found for selected class or section',
      );
    }

    const firstTimetable = orderedTimetables[0];
    const hasMismatch = orderedTimetables.some(
      (timetable) =>
        this.normalizeForCompare(timetable.days) !==
          this.normalizeForCompare(firstTimetable.days) ||
        this.normalizeForCompare(timetable.columns) !==
          this.normalizeForCompare(firstTimetable.columns) ||
        this.normalizeForCompare(timetable.cells) !==
          this.normalizeForCompare(firstTimetable.cells),
    );

    if (hasMismatch) {
      throw new BadRequestException('Selected sections timetable not same');
    }

    const sortedSectionNames = sectionIds.map(
      (id) =>
        selectedSectionItems.find((section: any) => section.id === id)?.name ||
        '',
    );

    const html = getTimetablePdfTemplate({
      schoolName: school?.schoolName || 'NEXA School Management System',
      schoolLogo: school?.logoPlaceholder || school?.logoUrl || null,
      sessionName: session.name,
      className: cls.enName,
      sectionNames: sortedSectionNames.filter(Boolean),
      days: (firstTimetable.days as string[]) || [],
      columns: (firstTimetable.columns as any[]) || [],
      cells: (firstTimetable.cells as Record<string, any[]>) || {},
      locale: query.locale || 'en',
      generatedAt: new Date(),
    });

    return this.pdfService.generatePdf(html);
  }
}
