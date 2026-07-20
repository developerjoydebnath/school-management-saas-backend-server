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
import { SaveExamRoutineDto } from './dto/exam-routine.dto';
import { getExamRoutinePdfTemplate } from './templates/exam-routine-pdf.template';

@Injectable()
export class ExamRoutinesService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}

  private get tenant(): any {
    return this.tenantConnection.getTenantClient() as any;
  }

  private mapDate(value?: string | null) {
    return value ? new Date(value) : null;
  }

  private async getTargetSchoolName() {
    const schemaName = this.tenantConnection.getTenantSchema();
    if (schemaName === 'public') {
      return {
        schoolName: 'NEXA School Management System',
        logoPlaceholder: null,
        logoUrl: null,
      };
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

  private getExamInclude(classId?: string) {
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
        where: classId ? { classId } : undefined,
        include: {
          class: { select: { id: true, enName: true, bnName: true } },
          subject: {
            select: {
              id: true,
              enName: true,
              bnName: true,
              code: true,
              boardCode: true,
            },
          },
          classRoom: { select: { id: true, name: true, roomNo: true } },
        },
        orderBy: [
          { examDate: 'asc' as const },
          { startTime: 'asc' as const },
          { sortOrder: 'asc' as const },
        ],
      },
    };
  }

  private async attachInvigilators(subjects: any[]) {
    const ids = [
      ...new Set(
        subjects
          .map((subject) => subject.invigilatorId)
          .filter(Boolean)
          .map(String),
      ),
    ];
    if (!ids.length) return subjects;

    const teachers = await this.tenant.teacher.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, fullName: true, employeeCode: true },
    });
    const teacherById = new Map(
      teachers.map((teacher: any) => [teacher.id, teacher]),
    );

    return subjects.map((subject) => ({
      ...subject,
      invigilator: subject.invigilatorId
        ? teacherById.get(subject.invigilatorId) || null
        : null,
    }));
  }

  private async getExam(examId: string, classId?: string) {
    const exam = await this.tenant.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: this.getExamInclude(classId),
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return {
      ...exam,
      subjects: await this.attachInvigilators(exam.subjects || []),
    };
  }

  private async getSession(sessionId: string) {
    return this.prisma.client.academicSession.findFirst({
      where: { id: sessionId },
      select: { id: true, name: true },
    });
  }

  private assertClassBelongsToExam(exam: any, classId: string) {
    const hasClass = (exam.classes || []).some(
      (item: any) => item.classId === classId,
    );
    if (!hasClass) {
      throw new BadRequestException('Selected class is not assigned to this exam');
    }
  }

  async findCurrent(query: { examId?: string; classId?: string }) {
    if (!query.examId) throw new BadRequestException('Exam is required');

    const examWithClasses = await this.getExam(query.examId);
    const selectedClassId = query.classId || examWithClasses.classes?.[0]?.classId;
    if (!selectedClassId) {
      throw new BadRequestException('No class found for selected exam');
    }

    this.assertClassBelongsToExam(examWithClasses, selectedClassId);
    const [exam, session] = await Promise.all([
      this.getExam(query.examId, selectedClassId),
      this.getSession(examWithClasses.sessionId),
    ]);

    return {
      success: true,
      statusCode: 200,
      message: 'Exam routine retrieved successfully',
      data: {
        exam: {
          id: exam.id,
          sessionId: exam.sessionId,
          session,
          name: exam.name,
          nameBn: exam.nameBn,
          type: exam.type,
          startDate: exam.startDate,
          endDate: exam.endDate,
          status: exam.status,
          instructions: exam.instructions,
          instructionsBn: exam.instructionsBn,
        },
        classes: exam.classes,
        selectedClassId,
        subjects: exam.subjects,
      },
      meta: null,
    };
  }

  async save(dto: SaveExamRoutineDto) {
    const exam = await this.getExam(dto.examId);
    this.assertClassBelongsToExam(exam, dto.classId);

    const subjectIds = dto.subjects.map((subject) => subject.id);
    const existingSubjects = await this.tenant.examSubject.findMany({
      where: {
        id: { in: subjectIds },
        examId: dto.examId,
        classId: dto.classId,
      },
      select: { id: true },
    });

    if (existingSubjects.length !== subjectIds.length) {
      throw new BadRequestException('One or more routine rows were not found');
    }

    await this.tenant.$transaction(
      dto.subjects.map((subject) =>
        this.tenant.examSubject.update({
          where: { id: subject.id },
          data: {
            examDate: this.mapDate(subject.examDate),
            startTime: subject.startTime || null,
            durationMins: subject.durationMins,
            classRoomId: subject.classRoomId || null,
            invigilatorId: subject.invigilatorId || null,
            status: subject.status,
          },
        }),
      ),
    );

    return this.findCurrent({ examId: dto.examId, classId: dto.classId });
  }

  async generatePrintPdf(query: {
    examId?: string;
    classId?: string;
    locale?: string;
  }): Promise<Buffer> {
    if (!query.examId) throw new BadRequestException('Exam is required');
    const examWithClasses = await this.getExam(query.examId);
    const selectedClassId = query.classId || examWithClasses.classes?.[0]?.classId;
    if (!selectedClassId) {
      throw new BadRequestException('No class found for selected exam');
    }
    this.assertClassBelongsToExam(examWithClasses, selectedClassId);

    const [exam, school, session] = await Promise.all([
      this.getExam(query.examId, selectedClassId),
      this.getTargetSchoolName(),
      this.getSession(examWithClasses.sessionId),
    ]);

    const selectedClass = exam.classes.find(
      (item: any) => item.classId === selectedClassId,
    )?.class;
    const locale = query.locale === 'bn' ? 'bn' : 'en';
    const instructions =
      locale === 'bn'
        ? exam.instructionsBn || exam.instructions
        : exam.instructions || exam.instructionsBn;

    const html = getExamRoutinePdfTemplate({
      schoolName: school?.schoolName || 'NEXA School Management System',
      schoolLogo: school?.logoPlaceholder || school?.logoUrl || null,
      examName: locale === 'bn' ? exam.nameBn || exam.name : exam.name,
      sessionName: session?.name || null,
      className: selectedClass?.enName || '-',
      startDate: exam.startDate,
      endDate: exam.endDate,
      instructions,
      subjects: (exam.subjects || []).map((subject: any) => ({
        examDate: subject.examDate,
        startTime: subject.startTime,
        durationMins: subject.durationMins,
        subjectName:
          locale === 'bn'
            ? subject.subject?.bnName || subject.subject?.enName
            : subject.subject?.enName,
        subjectCode: subject.subject?.code || subject.subject?.boardCode,
        classRoom: subject.classRoom,
        invigilatorName: subject.invigilator?.fullName || null,
        status: subject.status,
      })),
      locale,
      generatedAt: new Date(),
    });

    return this.pdfService.generatePdf(html);
  }
}
