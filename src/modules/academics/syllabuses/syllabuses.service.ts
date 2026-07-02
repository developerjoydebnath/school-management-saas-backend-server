import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import {
  CreateSyllabusDto,
  SyllabusStatusEnum,
  ToggleSyllabusTopicDto,
  UpdateSyllabusDto,
} from './dto/syllabus.dto';

@Injectable()
export class SyllabusesService {
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

  private parseDate(value?: string, end = false) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    date.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
    return date;
  }

  private getListSelect() {
    return {
      id: true,
      sessionId: true,
      examId: true,
      classId: true,
      sectionId: true,
      title: true,
      status: true,
      totalSubjects: true,
      totalChapters: true,
      totalTopics: true,
      completedTopics: true,
      completionPercent: true,
      updatedAt: true,
      exam: { select: { id: true, name: true, nameBn: true, type: true } },
      class: { select: { id: true, enName: true, bnName: true } },
      section: { select: { id: true, name: true } },
    };
  }

  private getDetailInclude() {
    return {
      exam: { select: { id: true, name: true, nameBn: true, type: true, status: true } },
      class: { select: { id: true, enName: true, bnName: true } },
      section: { select: { id: true, name: true } },
      subjects: {
        include: {
          subject: {
            select: {
              id: true,
              enName: true,
              bnName: true,
              code: true,
              fullMarks: true,
              passMarks: true,
              markDivision: true,
            },
          },
          chapters: {
            include: { topics: { orderBy: { sortOrder: 'asc' as const } } },
            orderBy: { sortOrder: 'asc' as const },
          },
          topics: { orderBy: { sortOrder: 'asc' as const } },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    };
  }

  private toNumber(value: any, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private roundPercent(value: number) {
    return Math.round(value * 100) / 100;
  }

  private assertWeightTotal(items: any[] = [], field: string, context: string) {
    if (!items.length) return;
    const total = this.roundPercent(
      items.reduce((sum, item) => sum + this.toNumber(item?.[field], 0), 0),
    );
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException(`${context} weight total must be 100`);
    }
  }

  private validateWeights(subjects: any[] = []) {
    for (const [subjectIndex, subject] of subjects.entries()) {
      const chapters = subject.chapters || [];
      this.assertWeightTotal(
        chapters,
        'weightPercent',
        `Subject ${subjectIndex + 1} chapter`,
      );
      for (const [chapterIndex, chapter] of chapters.entries()) {
        this.assertWeightTotal(
          chapter.topics || [],
          'weightPercent',
          `Subject ${subjectIndex + 1} chapter ${chapterIndex + 1} topic`,
        );
      }
    }
  }

  private getTopicProgress(topic: any) {
    if (topic.isCompleted) return 100;
    return Math.max(0, Math.min(100, this.toNumber(topic.progressPercent, 0)));
  }

  private calculateChapterStats(chapter: any) {
    const topics = chapter.topics || [];
    const totalWeight = topics.reduce(
      (sum: number, topic: any) => sum + this.toNumber(topic.weightPercent, 0),
      0,
    );
    const completedTopics = topics.filter((topic: any) => this.getTopicProgress(topic) >= 100).length;
    const weightedProgress = topics.reduce((sum: number, topic: any) => {
      const weight = this.toNumber(topic.weightPercent, 0);
      const progress = this.getTopicProgress(topic);
      return sum + (progress * weight) / 100;
    }, 0);

    return {
      totalTopics: topics.length,
      completedTopics,
      completionPercent: totalWeight ? this.roundPercent((weightedProgress / totalWeight) * 100) : 0,
    };
  }

  private calculateSubjectStats(subject: any) {
    const chapters = subject.chapters || [];
    const chapterStats = chapters.map((chapter: any) => this.calculateChapterStats(chapter));
    const totalWeight = chapters.reduce(
      (sum: number, chapter: any) => sum + this.toNumber(chapter.weightPercent, 0),
      0,
    );
    const weightedProgress = chapters.reduce((sum: number, chapter: any, index: number) => {
      const weight = this.toNumber(chapter.weightPercent, 0);
      return sum + (chapterStats[index].completionPercent * weight) / 100;
    }, 0);
    return {
      totalChapters: chapters.length,
      totalTopics: chapterStats.reduce((sum: number, item: any) => sum + item.totalTopics, 0),
      completedTopics: chapterStats.reduce(
        (sum: number, item: any) => sum + item.completedTopics,
        0,
      ),
      completionPercent: totalWeight ? this.roundPercent((weightedProgress / totalWeight) * 100) : 0,
    };
  }

  private calculateSyllabusStats(subjects: any[]) {
    const stats = subjects.map((subject) => this.calculateSubjectStats(subject));
    const totalTopics = stats.reduce((sum, item) => sum + item.totalTopics, 0);
    const completedTopics = stats.reduce((sum, item) => sum + item.completedTopics, 0);
    return {
      totalSubjects: subjects.length,
      totalChapters: stats.reduce((sum, item) => sum + item.totalChapters, 0),
      totalTopics,
      completedTopics,
      completionPercent: subjects.length
        ? this.roundPercent(stats.reduce((sum, item) => sum + item.completionPercent, 0) / subjects.length)
        : 0,
    };
  }

  private async assertReferences(dto: CreateSyllabusDto | UpdateSyllabusDto, base?: any) {
    const sessionId = 'sessionId' in dto ? dto.sessionId : base?.sessionId;
    const examId = 'examId' in dto ? dto.examId : base?.examId;
    const classId = 'classId' in dto ? dto.classId : base?.classId;
    const sectionIds = 'sectionIds' in dto ? dto.sectionIds || [] : [];
    const subjectIds = [...new Set(dto.subjects?.map((item) => item.subjectId) || [])];
    const teacherIds = [
      ...new Set(dto.subjects?.map((item) => item.teacherId).filter(Boolean) || []),
    ];

    const [session, exam, cls, sections, subjects, teachers] = await Promise.all([
      sessionId
        ? this.prisma.academicSession.findFirst({ where: { id: sessionId }, select: { id: true } })
        : Promise.resolve(null),
      examId
        ? this.prisma.exam.findFirst({
            where: { id: examId, deletedAt: null },
            select: { id: true, sessionId: true },
          })
        : Promise.resolve(null),
      classId
        ? this.prisma.class.findFirst({
            where: { id: classId, deletedAt: null, status: 'ACTIVE' },
            select: { id: true },
          })
        : Promise.resolve(null),
      sectionIds.length
        ? this.prisma.section.findMany({
            where: {
              id: { in: sectionIds },
              classId,
              deletedAt: null,
              status: 'ACTIVE',
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      subjectIds.length
        ? this.prisma.subject.findMany({
            where: {
              id: { in: subjectIds },
              deletedAt: null,
              status: 'ACTIVE',
              classes: classId ? { some: { classId } } : undefined,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      teacherIds.length
        ? this.prisma.teacher.findMany({
            where: { id: { in: teacherIds }, deletedAt: null, status: 'active' },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (sessionId && !session) throw new BadRequestException('Academic session not found');
    if (examId && !exam) throw new BadRequestException('Exam not found');
    if (classId && !cls) throw new BadRequestException('Class not found');
    if (exam && sessionId && exam.sessionId !== sessionId) {
      throw new BadRequestException('Exam does not belong to the selected session');
    }
    if (sections.length !== sectionIds.length) {
      throw new BadRequestException('One or more selected sections were not found');
    }
    if (subjects.length !== subjectIds.length) {
      throw new BadRequestException('One or more selected subjects were not found for this class');
    }
    if (teachers.length !== teacherIds.length) {
      throw new BadRequestException('One or more selected teachers were not found');
    }
  }

  private async createStructure(tx: any, syllabusId: string, subjects: any[] = []) {
    for (const [subjectIndex, subject] of subjects.entries()) {
      const chapters = subject.chapters || [];
      const totalTopics = chapters.reduce(
        (sum: number, chapter: any) => sum + (chapter.topics?.length || 0),
        0,
      );
      const completedTopics = chapters.reduce(
        (sum: number, chapter: any) =>
          sum +
          (chapter.topics || []).filter(
            (topic: any) => topic.isCompleted || this.toNumber(topic.progressPercent, 0) >= 100,
          ).length,
        0,
      );

      const syllabusSubject = await tx.syllabusSubject.create({
        data: {
          syllabusId,
          subjectId: subject.subjectId,
          teacherId: subject.teacherId || null,
          sortOrder: subjectIndex,
          totalChapters: chapters.length,
          totalTopics,
          completedTopics,
          completionPercent: this.calculateSubjectStats({ chapters }).completionPercent,
        },
      });

      for (const [chapterIndex, chapter] of chapters.entries()) {
        const chapterTopics = chapter.topics || [];
        const chapterStats = this.calculateChapterStats({ topics: chapterTopics });
        const syllabusChapter = await tx.syllabusChapter.create({
          data: {
            syllabusId,
            syllabusSubjectId: syllabusSubject.id,
            chapterNo: chapter.chapterNo ?? chapterIndex + 1,
            title: chapter.title,
            titleBn: chapter.titleBn || null,
            pageRange: chapter.pageRange || null,
            learningOutcome: chapter.learningOutcome || null,
            sortOrder: chapterIndex,
            weightPercent: chapter.weightPercent ?? 100,
            ...chapterStats,
          },
        });

        if (chapterTopics.length) {
          await tx.syllabusTopic.createMany({
            data: chapterTopics.map((topic: any, topicIndex: number) => ({
              syllabusId,
              syllabusSubjectId: syllabusSubject.id,
              syllabusChapterId: syllabusChapter.id,
              title: topic.title,
              titleBn: topic.titleBn || null,
              description: topic.description || null,
              estimatedClasses: topic.estimatedClasses ?? 1,
              weightPercent: topic.weightPercent ?? 100,
              progressPercent: topic.isCompleted ? 100 : (topic.progressPercent ?? 0),
              isCompleted: topic.isCompleted || this.toNumber(topic.progressPercent, 0) >= 100,
              completedAt:
                topic.isCompleted || this.toNumber(topic.progressPercent, 0) >= 100 ? new Date() : null,
              sortOrder: topicIndex,
            })),
          });
        }
      }
    }
  }

  private async refreshStats(tx: any, syllabusId: string) {
    const syllabus = await tx.syllabus.findFirst({
      where: { id: syllabusId },
      include: {
        subjects: {
          include: {
            chapters: {
              include: { topics: true },
            },
          },
        },
      },
    });

    if (!syllabus) throw new NotFoundException('Syllabus not found');

    for (const subject of syllabus.subjects) {
      const stats = this.calculateSubjectStats(subject);
      await tx.syllabusSubject.update({
        where: { id: subject.id },
        data: stats,
      });

      for (const chapter of subject.chapters) {
        const chapterStats = this.calculateChapterStats(chapter);
        await tx.syllabusChapter.update({
          where: { id: chapter.id },
          data: chapterStats,
        });
      }
    }

    const syllabusStats = this.calculateSyllabusStats(syllabus.subjects);
    await tx.syllabus.update({
      where: { id: syllabusId },
      data: syllabusStats,
    });
  }

  private async getSnapshot(tx: any, syllabusId: string) {
    return tx.syllabus.findFirst({
      where: { id: syllabusId },
      include: this.getDetailInclude(),
    });
  }

  private async writeHistory(
    tx: any,
    syllabusId: string,
    changeType: string,
    changedBy?: string,
    summary?: string,
  ) {
    const last = await tx.syllabusHistory.findFirst({
      where: { syllabusId },
      select: { version: true },
      orderBy: { version: 'desc' },
    });
    const snapshot = await this.getSnapshot(tx, syllabusId);
    await tx.syllabusHistory.create({
      data: {
        syllabusId,
        version: (last?.version || 0) + 1,
        changeType,
        changedBy: changedBy || null,
        summary: summary || null,
        snapshot,
      },
    });
  }

  async create(dto: CreateSyllabusDto, createdBy?: string) {
    await this.assertReferences(dto);
    this.validateWeights(dto.subjects || []);

    const sectionIds = [...new Set(dto.sectionIds || [])];
    const targets = sectionIds.length ? sectionIds : [null];
    const subjects = dto.subjects || [];

    return this.prisma.$transaction(async (tx: any) => {
      const created: any[] = [];

      for (const sectionId of targets) {
        const existing = await tx.syllabus.findFirst({
          where: {
            sessionId: dto.sessionId,
            examId: dto.examId,
            classId: dto.classId,
            sectionId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException('Syllabus already exists for this exam target');
        }

        const stats = this.calculateSyllabusStats(
          subjects.map((subject) => ({
            chapters: subject.chapters || [],
          })),
        );

        const syllabus = await tx.syllabus.create({
          data: {
            sessionId: dto.sessionId,
            examId: dto.examId,
            classId: dto.classId,
            sectionId,
            title: dto.title || null,
            status: dto.status || 'DRAFT',
            publishedAt: dto.status === SyllabusStatusEnum.PUBLISHED ? new Date() : null,
            createdBy: createdBy || null,
            ...stats,
          },
          select: { id: true },
        });

        await this.createStructure(tx, syllabus.id, subjects);
        await this.refreshStats(tx, syllabus.id);
        await this.writeHistory(tx, syllabus.id, 'CREATED', createdBy, 'Syllabus created');
        created.push(await this.getSnapshot(tx, syllabus.id));
      }

      return created.length === 1 ? created[0] : created;
    });
  }

  async findAll(query: any = {}) {
    const page = this.parsePage(query.page);
    const limit = this.parseLimit(query.limit);
    const where: any = { deletedAt: null };

    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.examId) where.examId = query.examId;
    if (query.classId) where.classId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;

    const statuses = this.parseList(query.status);
    if (statuses.length) where.status = { in: statuses };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { exam: { name: { contains: query.search, mode: 'insensitive' } } },
        { class: { enName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const dateFrom = this.parseDate(query.dateFrom);
    const dateTo = this.parseDate(query.dateTo, true);
    if (dateFrom || dateTo) {
      where.updatedAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.syllabus.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.syllabus.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Syllabuses retrieved successfully',
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
    const syllabus = await this.prisma.syllabus.findFirst({
      where: { id, deletedAt: null },
      include: this.getDetailInclude(),
    });

    if (!syllabus) throw new NotFoundException('Syllabus not found');
    return syllabus;
  }

  async update(id: string, dto: UpdateSyllabusDto, changedBy?: string) {
    const existing = await this.findOne(id);
    await this.assertReferences(dto, existing);
    if (dto.subjects) this.validateWeights(dto.subjects);

    return this.prisma.$transaction(async (tx: any) => {
      await tx.syllabus.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title || null } : {}),
          ...(dto.status !== undefined
            ? {
                status: dto.status,
                publishedAt:
                  dto.status === SyllabusStatusEnum.PUBLISHED
                    ? existing.publishedAt || new Date()
                    : existing.publishedAt,
              }
            : {}),
        },
      });

      if (dto.subjects) {
        await tx.syllabusSubject.deleteMany({ where: { syllabusId: id } });
        await this.createStructure(tx, id, dto.subjects);
      }

      await this.refreshStats(tx, id);
      await this.writeHistory(tx, id, 'UPDATED', changedBy, 'Syllabus updated');
      return this.getSnapshot(tx, id);
    });
  }

  async updateStatus(id: string, status: SyllabusStatusEnum, changedBy?: string) {
    await this.findOne(id);
    const changeType =
      status === SyllabusStatusEnum.PUBLISHED
        ? 'PUBLISHED'
        : status === SyllabusStatusEnum.ARCHIVED
          ? 'ARCHIVED'
          : 'UPDATED';

    return this.prisma.$transaction(async (tx: any) => {
      await tx.syllabus.update({
        where: { id },
        data: {
          status,
          publishedAt: status === SyllabusStatusEnum.PUBLISHED ? new Date() : null,
        },
      });
      await this.writeHistory(
        tx,
        id,
        changeType,
        changedBy,
        `Syllabus ${status.toLowerCase()}`,
      );
      return this.getSnapshot(tx, id);
    });
  }

  async toggleTopic(id: string, topicId: string, dto: ToggleSyllabusTopicDto, changedBy?: string) {
    await this.findOne(id);
    const topic = await this.prisma.syllabusTopic.findFirst({
      where: { id: topicId, syllabusId: id },
    });
    if (!topic) throw new NotFoundException('Syllabus topic not found');

    return this.prisma.$transaction(async (tx: any) => {
      await tx.syllabusTopic.update({
        where: { id: topicId },
        data: {
          progressPercent:
            dto.isCompleted === true
              ? 100
              : dto.progressPercent !== undefined
                ? dto.progressPercent
                : dto.isCompleted === false
                  ? Math.min(this.toNumber(topic.progressPercent, 0), 99)
                  : this.toNumber(topic.progressPercent, 0),
          isCompleted:
            dto.isCompleted !== undefined
              ? dto.isCompleted
              : this.toNumber(dto.progressPercent, 0) >= 100,
          completedAt:
            dto.isCompleted === true || this.toNumber(dto.progressPercent, 0) >= 100
              ? new Date()
              : null,
          completedBy:
            dto.isCompleted === true || this.toNumber(dto.progressPercent, 0) >= 100
              ? changedBy || null
              : null,
        },
      });
      await this.refreshStats(tx, id);
      await tx.syllabusActivityLog.create({
        data: {
          syllabusId: id,
          entityType: 'topic',
          entityId: topicId,
          changeType:
            dto.isCompleted === true || this.toNumber(dto.progressPercent, 0) >= 100
              ? 'TOPIC_COMPLETED'
              : 'TOPIC_UPDATED',
          previousValue: {
            isCompleted: topic.isCompleted,
            progressPercent: topic.progressPercent,
          },
          newValue: {
            isCompleted: dto.isCompleted,
            progressPercent: dto.progressPercent,
          },
          message: 'Topic progress updated',
          changedBy: changedBy || null,
        },
      });
      await this.writeHistory(tx, id, 'TOPIC_UPDATED', changedBy, 'Syllabus progress updated');
      return this.getSnapshot(tx, id);
    });
  }

  async findHistory(id: string, query: any = {}) {
    await this.findOne(id);
    const page = this.parsePage(query.page);
    const limit = this.parseLimit(query.limit);
    const [items, total] = await Promise.all([
      this.prisma.syllabusHistory.findMany({
        where: { syllabusId: id },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          syllabusId: true,
          version: true,
          changeType: true,
          summary: true,
          changedAt: true,
          changedBy: true,
        },
        orderBy: { version: 'desc' },
      }),
      this.prisma.syllabusHistory.count({ where: { syllabusId: id } }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      statusCode: 200,
      message: 'Syllabus history retrieved successfully',
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

  async findHistoryOne(id: string, historyId: string) {
    await this.findOne(id);
    const history = await this.prisma.syllabusHistory.findFirst({
      where: { id: historyId, syllabusId: id },
    });
    if (!history) throw new NotFoundException('Syllabus history not found');
    return history;
  }

  async remove(id: string, deletedBy?: string) {
    await this.findOne(id);
    return this.prisma.syllabus.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
      },
    });
  }
}
