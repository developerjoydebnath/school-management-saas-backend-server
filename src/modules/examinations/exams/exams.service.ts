import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import {
  CreateExamDto,
  ExamStatusEnum,
  UpdateExamDto,
  UpdateExamSubjectDto,
} from './dto/exam.dto';

@Injectable()
export class ExamsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private get prisma(): any {
    return this.tenantConnection.getTenantClient() as any;
  }

  private parsePage(value?: string) {
    const page = Number(value || 1);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  private parseLimit(value?: string) {
    const limit = Number(value || 10);
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10;
  }

  private parseList(value?: string) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseDate(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private getListSelect() {
    return {
      id: true,
      sessionId: true,
      name: true,
      nameBn: true,
      type: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      classes: {
        select: {
          class: { select: { id: true, enName: true, bnName: true } },
        },
      },
      _count: { select: { subjects: true, syllabuses: true } },
    };
  }

  private getDetailInclude() {
    return {
      classes: {
        include: {
          class: {
            select: {
              id: true,
              enName: true,
              bnName: true,
            },
          },
        },
        orderBy: { class: { enName: 'asc' as const } },
      },
      subjects: {
        include: {
          class: { select: { id: true, enName: true, bnName: true } },
          subject: {
            select: {
              id: true,
              enName: true,
              bnName: true,
              code: true,
              boardCode: true,
              type: true,
              group: true,
            },
          },
          classRoom: { select: { id: true, name: true, roomNo: true } },
        },
        orderBy: [{ examDate: 'asc' as const }, { sortOrder: 'asc' as const }],
      },
      _count: { select: { syllabuses: true } },
    };
  }

  private mapDate(value?: string | null) {
    return value ? new Date(value) : null;
  }

  private async assertSessionExists(sessionId: string) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) throw new BadRequestException('Academic session not found');
  }

  private async assertClassesExist(classIds: string[]) {
    const uniqueIds = [...new Set(classIds || [])];
    if (!uniqueIds.length) {
      throw new BadRequestException('At least one class is required');
    }

    const classes = await this.prisma.class.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    if (classes.length !== uniqueIds.length) {
      throw new BadRequestException('One or more selected classes were not found');
    }
  }

  private validateDateRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Exam end date must be after start date');
    }
  }

  private copySubjectMarks(subject: any) {
    const markDivision = subject.markDivision || 'WRITTEN';
    const hasMcq =
      markDivision === 'WRITTEN_MCQ' ||
      markDivision === 'WRITTEN_MCQ_PRACTICAL';
    const hasPractical = markDivision === 'WRITTEN_MCQ_PRACTICAL';
    const totalMarks = subject.fullMarks ?? 100;
    const passMarks = subject.passMarks ?? 33;

    return {
      totalMarks,
      passMarks,
      markDivision,
      writtenMarks: subject.writtenMarks ?? subject.theoryMarks ?? totalMarks,
      writtenPassMarks: subject.writtenPassMarks ?? passMarks,
      mcqMarks: hasMcq ? (subject.mcqMarks ?? 0) : 0,
      mcqPassMarks: hasMcq ? (subject.mcqPassMarks ?? 0) : 0,
      practicalMarks: hasPractical ? (subject.practicalMarks ?? 0) : 0,
      practicalPassMarks: hasPractical ? (subject.practicalPassMarks ?? 0) : 0,
      caMarks: 0,
      caPassMarks: 0,
    };
  }

  private validateSubjectMarks(data: any) {
    const markDivision = data.markDivision || 'WRITTEN';
    const hasMcq =
      markDivision === 'WRITTEN_MCQ' ||
      markDivision === 'WRITTEN_MCQ_PRACTICAL';
    const hasPractical = markDivision === 'WRITTEN_MCQ_PRACTICAL';
    const writtenMarks = data.writtenMarks ?? 0;
    const mcqMarks = hasMcq ? (data.mcqMarks ?? 0) : 0;
    const practicalMarks = hasPractical ? (data.practicalMarks ?? 0) : 0;
    const caMarks = data.caMarks ?? 0;
    const writtenPassMarks = data.writtenPassMarks ?? 0;
    const mcqPassMarks = hasMcq ? (data.mcqPassMarks ?? 0) : 0;
    const practicalPassMarks = hasPractical ? (data.practicalPassMarks ?? 0) : 0;
    const caPassMarks = data.caPassMarks ?? 0;

    if (writtenMarks + mcqMarks + practicalMarks + caMarks !== data.totalMarks) {
      throw new BadRequestException(
        'Exam subject mark divisions must equal total marks',
      );
    }
    if (
      writtenPassMarks + mcqPassMarks + practicalPassMarks + caPassMarks !==
      data.passMarks
    ) {
      throw new BadRequestException(
        'Exam subject pass mark divisions must equal pass marks',
      );
    }
  }

  private async createMissingExamSubjects(tx: any, examId: string, classIds: string[]) {
    const examClasses = await tx.examClass.findMany({
      where: { examId, classId: { in: classIds } },
      select: { id: true, classId: true },
    });

    if (!examClasses.length) return;

    const subjectClasses = await tx.subjectClass.findMany({
      where: {
        classId: { in: examClasses.map((item: any) => item.classId) },
        subject: { deletedAt: null, status: 'ACTIVE' },
      },
      include: { subject: true },
      orderBy: { subject: { sortOrder: 'asc' as const } },
    });

    const examClassByClassId = new Map(
      examClasses.map((item: any) => [item.classId, item]),
    );

    const rows = subjectClasses.map((item: any, index: number) => {
      const examClass = examClassByClassId.get(item.classId) as any;
      return {
        examId,
        examClassId: examClass.id,
        classId: item.classId,
        subjectId: item.subjectId,
        sortOrder: index,
        ...this.copySubjectMarks(item.subject),
      };
    });

    if (!rows.length) return;

    await tx.examSubject.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  async create(dto: CreateExamDto, createdBy?: string) {
    this.validateDateRange(dto.startDate, dto.endDate);
    await Promise.all([
      this.assertSessionExists(dto.sessionId),
      this.assertClassesExist(dto.classIds),
    ]);

    const classIds = [...new Set(dto.classIds)];

    return this.prisma.$transaction(async (tx: any) => {
      const exam = await tx.exam.create({
        data: {
          sessionId: dto.sessionId,
          name: dto.name,
          nameBn: dto.nameBn || null,
          type: dto.type || 'HALF_YEARLY',
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: dto.status || 'DRAFT',
          instructions: dto.instructions || null,
          instructionsBn: dto.instructionsBn || null,
          gradingScale: dto.gradingScale || 'gpa_5',
          defaultTotalMarks: dto.defaultTotalMarks ?? 100,
          defaultPassMarks: dto.defaultPassMarks ?? 33,
          notes: dto.notes || null,
          createdBy: createdBy || null,
          classes: {
            create: classIds.map((classId) => ({
              classId,
              status: dto.status || 'DRAFT',
            })),
          },
        },
        include: this.getDetailInclude(),
      });

      await this.createMissingExamSubjects(tx, exam.id, classIds);

      return tx.exam.findFirst({
        where: { id: exam.id },
        include: this.getDetailInclude(),
      });
    });
  }

  async findAll(query: any = {}) {
    const page = this.parsePage(query.page);
    const limit = this.parseLimit(query.limit);
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameBn: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const statuses = this.parseList(query.status);
    if (statuses.length) where.status = { in: statuses };

    const types = this.parseList(query.type);
    if (types.length) where.type = { in: types };

    if (query.sessionId) where.sessionId = query.sessionId;

    if (query.classId) {
      where.classes = { some: { classId: query.classId } };
    }

    const dateFrom = this.parseDate(query.dateFrom);
    const dateTo = this.parseDate(query.dateTo);
    if (dateFrom || dateTo) {
      where.startDate = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.exam.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Exams retrieved successfully',
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

  async findActiveList(query: any = {}) {
    const where: any = {
      deletedAt: null,
      status: { in: ['DRAFT', 'SCHEDULED', 'ONGOING'] },
    };
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.classId) where.classes = { some: { classId: query.classId } };

    const items = await this.prisma.exam.findMany({
      where,
      select: {
        id: true,
        sessionId: true,
        name: true,
        nameBn: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active exams retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, deletedAt: null },
      include: this.getDetailInclude(),
    });

    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async update(id: string, dto: UpdateExamDto) {
    const existing = await this.findOne(id);
    this.validateDateRange(
      dto.startDate || existing.startDate?.toISOString(),
      dto.endDate || existing.endDate?.toISOString(),
    );

    if (dto.sessionId) await this.assertSessionExists(dto.sessionId);
    if (dto.classIds) await this.assertClassesExist(dto.classIds);

    return this.prisma.$transaction(async (tx: any) => {
      await tx.exam.update({
        where: { id },
        data: {
          ...(dto.sessionId !== undefined ? { sessionId: dto.sessionId } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.nameBn !== undefined ? { nameBn: dto.nameBn || null } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
          ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.instructions !== undefined
            ? { instructions: dto.instructions || null }
            : {}),
          ...(dto.instructionsBn !== undefined
            ? { instructionsBn: dto.instructionsBn || null }
            : {}),
          ...(dto.gradingScale !== undefined
            ? { gradingScale: dto.gradingScale || 'gpa_5' }
            : {}),
          ...(dto.defaultTotalMarks !== undefined
            ? { defaultTotalMarks: dto.defaultTotalMarks }
            : {}),
          ...(dto.defaultPassMarks !== undefined
            ? { defaultPassMarks: dto.defaultPassMarks }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        },
      });

      if (dto.classIds) {
        const nextIds = [...new Set(dto.classIds)];
        const currentIds = existing.classes.map((item: any) => item.classId);
        const removeIds = currentIds.filter((classId: string) => !nextIds.includes(classId));
        const addIds = nextIds.filter((classId) => !currentIds.includes(classId));

        if (removeIds.length) {
          await tx.examClass.deleteMany({ where: { examId: id, classId: { in: removeIds } } });
        }

        if (addIds.length) {
          await tx.examClass.createMany({
            data: addIds.map((classId) => ({
              examId: id,
              classId,
              status: dto.status || existing.status,
            })),
            skipDuplicates: true,
          });
          await this.createMissingExamSubjects(tx, id, addIds);
        }
      }

      return tx.exam.findFirst({
        where: { id },
        include: this.getDetailInclude(),
      });
    });
  }

  async updateStatus(id: string, status: ExamStatusEnum) {
    await this.findOne(id);
    return this.prisma.exam.update({
      where: { id },
      data: { status },
    });
  }

  async updateSubject(id: string, subjectId: string, dto: UpdateExamSubjectDto) {
    await this.findOne(id);
    const existing = await this.prisma.examSubject.findFirst({
      where: { id: subjectId, examId: id },
    });
    if (!existing) throw new NotFoundException('Exam subject not found');

    const data = {
      ...(dto.examDate !== undefined ? { examDate: this.mapDate(dto.examDate) } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime || null } : {}),
      ...(dto.durationMins !== undefined ? { durationMins: dto.durationMins } : {}),
      ...(dto.classRoomId !== undefined ? { classRoomId: dto.classRoomId || null } : {}),
      ...(dto.invigilatorId !== undefined ? { invigilatorId: dto.invigilatorId || null } : {}),
      ...(dto.totalMarks !== undefined ? { totalMarks: dto.totalMarks } : {}),
      ...(dto.passMarks !== undefined ? { passMarks: dto.passMarks } : {}),
      ...(dto.markDivision !== undefined ? { markDivision: dto.markDivision } : {}),
      ...(dto.writtenMarks !== undefined ? { writtenMarks: dto.writtenMarks } : {}),
      ...(dto.writtenPassMarks !== undefined
        ? { writtenPassMarks: dto.writtenPassMarks }
        : {}),
      ...(dto.mcqMarks !== undefined ? { mcqMarks: dto.mcqMarks } : {}),
      ...(dto.mcqPassMarks !== undefined ? { mcqPassMarks: dto.mcqPassMarks } : {}),
      ...(dto.practicalMarks !== undefined
        ? { practicalMarks: dto.practicalMarks }
        : {}),
      ...(dto.practicalPassMarks !== undefined
        ? { practicalPassMarks: dto.practicalPassMarks }
        : {}),
      ...(dto.caMarks !== undefined ? { caMarks: dto.caMarks } : {}),
      ...(dto.caPassMarks !== undefined ? { caPassMarks: dto.caPassMarks } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };

    this.validateSubjectMarks({ ...existing, ...data });

    return this.prisma.examSubject.update({
      where: { id: subjectId },
      data,
      include: {
        class: { select: { id: true, enName: true, bnName: true } },
        subject: { select: { id: true, enName: true, bnName: true, code: true } },
        classRoom: { select: { id: true, name: true, roomNo: true } },
      },
    });
  }

  async remove(id: string, deletedBy?: string) {
    const exam = await this.findOne(id);
    if (!['DRAFT', 'CANCELLED'].includes(exam.status)) {
      throw new BadRequestException('Only draft or cancelled exams can be deleted');
    }

    return this.prisma.exam.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
        status: 'ARCHIVED',
      },
    });
  }
}
