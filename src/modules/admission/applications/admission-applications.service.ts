import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { AdmissionSettingsService } from '../settings/admission-settings.service';
import {
  ApproveAdmissionDto,
  CreateAdmissionApplicationDto,
  RejectAdmissionDto,
  UpdateAdmissionApplicationDto,
  WaitlistAdmissionDto,
} from './dto/admission-application.dto';

@Injectable()
export class AdmissionApplicationsService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private settingsService: AdmissionSettingsService,
  ) {}

  private prisma() {
    return this.tenantConnection.getTenantClient();
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private normalizeStatus(status?: string) {
    return String(status || 'pending').toLowerCase();
  }

  private normalizeSource(source?: string, mode = 'fast') {
    return source || (mode === 'full' ? 'admin_full' : 'admin_fast');
  }

  private toDate(value?: string | Date | null) {
    return value ? new Date(value) : undefined;
  }

  private toInt(value: any) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private toMoney(value: any) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return Number(Math.max(parsed, 0).toFixed(2));
  }

  private jsonValue(value: any) {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private async calculateAdmissionFee(dto: any, userId?: string) {
    const sessionId = dto.sessionId || dto.session;
    const classId = dto.applyingClassId || dto.classId || dto.class;
    if (!sessionId) return null;
    const response = await this.settingsService.calculateFee(sessionId, classId, userId, {
      type: dto.manualDiscountType,
      scope: dto.manualDiscountScope,
      value: dto.manualDiscountValue,
      reason: dto.manualDiscountReason,
    }, dto.specialQuota || dto.quota);
    return response.data ?? null;
  }

  private async resolveReference(dto: any) {
    const mobile = dto.referenceMobile?.trim();
    if (!mobile) {
      return {
        referenceUserId: dto.referenceUserId || null,
        referenceName: dto.referenceName || null,
        referenceMobile: null,
      };
    }

    const matchedUser = await this.prisma().user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { phone: mobile },
          { profile: { is: { phone: mobile } } },
        ],
      },
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      referenceUserId: matchedUser?.id || dto.referenceUserId || null,
      referenceName:
        dto.referenceName ||
        (matchedUser?.profile
          ? `${matchedUser.profile.firstName || ''} ${matchedUser.profile.lastName || ''}`.trim()
          : null),
      referenceMobile: mobile,
    };
  }

  private mapApplicationData(dto: any, userId?: string, feeSummary?: any, reference?: any) {
    const admissionMode = dto.admissionMode || 'fast';
    const payableAmount = this.toMoney(feeSummary?.payableAmount);
    const requestedPaidAmount = this.toMoney(dto.admissionFeeAmount ?? dto.admissionFee);
    const paidAmount =
      requestedPaidAmount === null
        ? payableAmount
        : payableAmount === null
          ? requestedPaidAmount
          : Math.min(requestedPaidAmount, payableAmount);
    const dueAmount =
      payableAmount === null || paidAmount === null
        ? null
        : Number(Math.max(payableAmount - paidAmount, 0).toFixed(2));
    const normalizedPaymentStatus =
      dueAmount && dueAmount > 0
        ? paidAmount && paidAmount > 0
          ? 'partial'
          : 'pending'
        : paidAmount && paidAmount > 0
          ? 'paid'
          : dto.paymentStatus || 'pending';
    const data: any = {
      sessionId: dto.sessionId || dto.session,
      status: dto.status ? this.normalizeStatus(dto.status) : undefined,
      source: dto.source || this.normalizeSource(undefined, admissionMode),
      admissionMode,
      currentStep: dto.currentStep || null,
      completionPercent: dto.completionPercent ?? 0,
      isDraft: dto.isDraft ?? false,
      submittedAt: dto.isDraft ? null : new Date(),

      studentNameEn: dto.studentNameEn || dto.fullName || dto.studentName,
      studentNameBn: dto.studentNameBn || dto.fullNameBn || null,
      dateOfBirth: this.toDate(dto.dateOfBirth || dto.dob),
      gender: dto.gender,
      birthRegistrationNo: dto.birthRegistrationNo || null,
      bloodGroup: dto.bloodGroup || null,
      religion: dto.religion || null,
      nationality: dto.nationality || 'Bangladeshi',
      specialQuota: this.jsonValue(dto.specialQuota || dto.quota),
      photoUrl: dto.photoUrl || dto.photo?.url || null,
      photoPlaceholder: dto.photoPlaceholder || dto.photo?.placeholder || null,
      photoMediaId: dto.photoMediaId || dto.photo?.mediaId || null,

      applyingClassId: dto.applyingClassId || dto.classId || dto.class,
      sectionId: dto.sectionId || dto.section || null,
      admissionType: dto.admissionType || 'new',
      mediumOrVersion: dto.mediumOrVersion || null,
      shift: dto.shift || null,
      groupOrDept: dto.groupOrDept || null,
      previousSchoolName: dto.previousSchoolName || dto.previousSchool || null,
      previousSchoolEiin: dto.previousSchoolEiin || null,
      transferCertificateNo: dto.transferCertificateNo || dto.tcNumber || null,
      lastClassCompleted: dto.lastClassCompleted || null,
      lastExamResult: dto.lastExamResult || dto.lastResult || null,

      fatherName: dto.fatherName,
      fatherNameBn: dto.fatherNameBn || null,
      fatherNid: dto.fatherNid || null,
      fatherOccupation: dto.fatherOccupation || null,
      fatherMobile: dto.fatherMobile || dto.mobile || dto.contact,
      motherName: dto.motherName || null,
      motherNameBn: dto.motherNameBn || null,
      motherNid: dto.motherNid || null,
      motherOccupation: dto.motherOccupation || null,
      motherMobile: dto.motherMobile || null,
      guardianName: dto.guardianName || null,
      guardianRelation: dto.guardianRelation || null,
      guardianNid: dto.guardianNid || null,
      guardianMobile: dto.guardianMobile || null,
      localGuardianName: dto.localGuardianName || null,
      localGuardianMobile: dto.localGuardianMobile || null,
      localGuardianAddress: dto.localGuardianAddress || null,
      emergencyContactName: dto.emergencyContactName || null,
      emergencyContactPhone: dto.emergencyContactPhone || dto.emergencyContact || null,
      monthlyFamilyIncome: dto.monthlyFamilyIncome ?? null,

      presentAddress: dto.presentAddress || null,
      presentDivisionId: this.toInt(dto.presentDivisionId),
      presentDistrictId: this.toInt(dto.presentDistrictId),
      presentUpazilaId: this.toInt(dto.presentUpazilaId),
      permanentSameAsPresent: dto.permanentSameAsPresent ?? false,
      permanentAddress: dto.permanentAddress || null,
      permanentDivisionId: this.toInt(dto.permanentDivisionId),
      permanentDistrictId: this.toInt(dto.permanentDistrictId),
      permanentUpazilaId: this.toInt(dto.permanentUpazilaId),

      documents: this.jsonValue(dto.documents),
      allergies: dto.allergies || null,
      medicalConditions: dto.medicalConditions || null,
      disabilityType: dto.disabilityType || null,
      immunizationComplete: dto.immunizationComplete ?? null,
      admissionFeeAmount: paidAmount,
      admissionFeeSubtotal: feeSummary?.subtotal ?? null,
      admissionDiscountAmount: feeSummary?.discountAmount ?? null,
      admissionPayableAmount: payableAmount,
      discountType: feeSummary?.discountType ?? null,
      discountScope: feeSummary?.discountScope ?? null,
      discountValue: feeSummary?.discountValue ?? null,
      discountSource: feeSummary?.discountSource ?? null,
      discountReason: feeSummary?.discountReason ?? dto.manualDiscountReason ?? null,
      referenceUserId: reference?.referenceUserId ?? null,
      referenceName: reference?.referenceName ?? null,
      referenceMobile: reference?.referenceMobile ?? null,
      paymentStatus: normalizedPaymentStatus,
      paymentMethod: dto.paymentMethod || null,
      transactionId: dto.transactionId || null,
      paidAt: this.toDate(dto.paidAt) || null,
      customData: {
        ...(typeof this.jsonValue(dto.customData) === 'object' && this.jsonValue(dto.customData)
          ? this.jsonValue(dto.customData)
          : {}),
        admissionDueAmount: dueAmount,
        admissionPaidAmount: paidAmount,
      },
      notes: dto.notes || null,
      updatedBy: userId || null,
    };

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    return data;
  }

  private listSelect() {
    return {
      id: true,
      applicationNo: true,
      studentNameEn: true,
      fatherName: true,
      fatherMobile: true,
      status: true,
      source: true,
      submittedAt: true,
      paymentStatus: true,
      applyingClass: { select: { id: true, enName: true, bnName: true } },
      section: { select: { id: true, name: true } },
    };
  }

  private detailsInclude() {
    return {
      applyingClass: true,
      section: true,
      student: { select: { id: true, studentIdNo: true, status: true } },
      presentDivision: true,
      presentDistrict: true,
      presentUpazila: true,
      permanentDivision: true,
      permanentDistrict: true,
      permanentUpazila: true,
    };
  }

  private normalizeApplication(item: any) {
    if (!item) return item;
    return {
      ...item,
      fullName: item.studentNameEn,
      studentName: item.studentNameEn,
      class: item.applyingClass?.enName || item.applyingClassId,
      classId: item.applyingClassId,
      section: item.section?.name || item.sectionId,
      session: item.sessionId,
      mobile: item.fatherMobile,
      contact: item.fatherMobile,
      date: item.submittedAt || item.createdAt,
    };
  }

  private async validateRequiredFields(application: any) {
    const admissionMode = application.admissionMode || 'fast';
    const settings = await this.prisma().admissionSettings.findFirst({
      where: { sessionId: application.sessionId, deletedAt: null },
      include: {
        fieldConfigs: {
          where: { deletedAt: null },
        },
      },
    });
    const requiredFields = ((settings as any)?.fieldConfigs || []).filter((field: any) => {
      const shown =
        admissionMode === 'fast'
          ? (field.showInFastMode ?? field.isShown)
          : (field.showInFullMode ?? field.isShown);
      const required =
        admissionMode === 'fast'
          ? (field.requiredInFastMode ?? field.isRequired)
          : (field.requiredInFullMode ?? field.isRequired);
      return shown && required;
    });
    const customData = (application.customData || {}) as Record<string, any>;

    const valueByField: Record<string, any> = {
      fullName: application.studentNameEn,
      studentNameEn: application.studentNameEn,
      dob: application.dateOfBirth,
      dateOfBirth: application.dateOfBirth,
      gender: application.gender,
      class: application.applyingClassId,
      classId: application.applyingClassId,
      applyingClassId: application.applyingClassId,
      section: application.sectionId,
      sectionId: application.sectionId,
      session: application.sessionId,
      sessionId: application.sessionId,
      fatherName: application.fatherName,
      mobile: application.fatherMobile,
      fatherMobile: application.fatherMobile,
      admissionType: application.admissionType,
    };

    const missing = requiredFields.filter((field: any) => {
      const value = field.isCustom
        ? customData[field.fieldKey]
        : valueByField[field.fieldKey] ?? application[field.fieldKey];
      return value === undefined || value === null || value === '';
    });

    if (missing.length) {
      throw new BadRequestException(
        `Required admission field missing: ${missing[0].label}`,
      );
    }
  }

  async create(dto: CreateAdmissionApplicationDto, userId?: string) {
    const prisma = this.prisma();
    const sessionId = dto.sessionId || dto.session;
    if (!sessionId) throw new BadRequestException('Session is required');
    const settingsResponse = await this.settingsService.getBySession(sessionId, userId);
    const settings = settingsResponse.data;
    const mode = dto.admissionMode || settings.admissionMode || 'fast';
    const feeSummary = await this.calculateAdmissionFee(dto, userId);
    const reference = await this.resolveReference(dto);
    const session = await prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { year: true },
    });
    if (!session) throw new BadRequestException('Session not found');

    const created = await prisma.$transaction(async (tx) => {
      const updatedSettings = await tx.admissionSettings.update({
        where: { id: settings.id },
        data: { applicationNoSeq: { increment: 1 } },
        select: { applicationPrefix: true, applicationNoSeq: true },
      });
      const applicationNo = `${updatedSettings.applicationPrefix}-${session.year}-${String(updatedSettings.applicationNoSeq).padStart(4, '0')}`;
      return tx.admissionApplication.create({
        data: {
          ...this.mapApplicationData(
            { ...dto, admissionMode: mode },
            userId,
            feeSummary,
            reference,
          ),
          applicationNo,
          source: this.normalizeSource(dto.source, mode),
          createdBy: userId || null,
        },
        include: this.detailsInclude(),
      });
    });

    return this.response(
      'Admission application created successfully',
      this.normalizeApplication(created),
      201,
    );
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { applicationNo: { contains: query.search, mode: 'insensitive' } },
        { studentNameEn: { contains: query.search, mode: 'insensitive' } },
        { fatherName: { contains: query.search, mode: 'insensitive' } },
        { fatherMobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = { in: String(query.status).split(',').map((v) => v.trim().toLowerCase()) };
    if (query.source) where.source = { in: String(query.source).split(',').map((v) => v.trim()) };
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.classId) where.applyingClassId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.paymentStatus) where.paymentStatus = { in: String(query.paymentStatus).split(',').map((v) => v.trim()) };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      prisma.admissionApplication.findMany({
        where,
        select: this.listSelect(),
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.admissionApplication.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return this.response('Admission applications retrieved successfully', {
      items: items.map((item) => this.normalizeApplication(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  }

  async findOne(id: string) {
    const application = await this.prisma().admissionApplication.findFirst({
      where: { id, deletedAt: null },
      include: this.detailsInclude(),
    });
    if (!application) throw new NotFoundException('Admission application not found');
    return this.response(
      'Admission application retrieved successfully',
      this.normalizeApplication(application),
    );
  }

  async update(id: string, dto: UpdateAdmissionApplicationDto, userId?: string) {
    await this.findOne(id);
    const feeSummary = await this.calculateAdmissionFee(dto, userId);
    const reference = await this.resolveReference(dto);
    const updated = await this.prisma().admissionApplication.update({
      where: { id },
      data: {
        ...this.mapApplicationData(dto, userId, feeSummary, reference),
      },
      include: this.detailsInclude(),
    });
    return this.response(
      'Admission application updated successfully',
      this.normalizeApplication(updated),
    );
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma().admissionApplication.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null },
    });
    return this.response('Admission application deleted successfully', null);
  }

  async approve(id: string, dto: ApproveAdmissionDto, userId?: string) {
    const prisma = this.prisma();
    const application = await prisma.admissionApplication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Admission application not found');
    if (application.status === 'approved' || application.studentId) {
      throw new ConflictException('Admission application is already approved');
    }
    await this.validateRequiredFields(application);

    const sectionId = dto.sectionId || application.sectionId;
    const rollNumber = dto.rollNumber?.trim() || null;
    if (rollNumber) {
      const existingRoll = await prisma.student.findFirst({
        where: {
          currentSessionId: application.sessionId,
          classId: application.applyingClassId,
          sectionId,
          rollNumber,
          status: 'active',
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existingRoll) throw new ConflictException('Roll number is already taken');
    }

    const session = await prisma.academicSession.findUnique({
      where: { id: application.sessionId },
      select: { year: true },
    });
    if (!session) throw new BadRequestException('Session not found');

    const createdStudent = await prisma.$transaction(async (tx) => {
      const totalStudents = await tx.student.count({
        where: { currentSessionId: application.sessionId },
      });
      const studentIdNo = `STU-${session.year}-${String(totalStudents + 1).padStart(4, '0')}`;
      const student = await tx.student.create({
        data: {
          admissionApplicationId: application.id,
          studentIdNo,
          fullNameEn: application.studentNameEn,
          fullNameBn: application.studentNameBn,
          dateOfBirth: application.dateOfBirth,
          gender: application.gender,
          birthRegistrationNo: application.birthRegistrationNo,
          bloodGroup: application.bloodGroup,
          religion: application.religion,
          nationality: application.nationality,
          specialQuota: application.specialQuota as any,
          photoUrl: application.photoUrl,
          photoPlaceholder: application.photoPlaceholder,
          photoMediaId: application.photoMediaId,
          classId: application.applyingClassId,
          sectionId,
          currentSessionId: application.sessionId,
          rollNumber,
          mediumOrVersion: application.mediumOrVersion,
          shift: application.shift,
          groupOrDept: application.groupOrDept,
          admissionType: application.admissionType,
          admissionDate: new Date(),
          previousSchoolName: application.previousSchoolName,
          previousSchoolEiin: application.previousSchoolEiin,
          transferCertificateNo: application.transferCertificateNo,
          lastClassCompleted: application.lastClassCompleted,
          lastExamResult: application.lastExamResult,
          fatherName: application.fatherName,
          fatherNameBn: application.fatherNameBn,
          fatherNid: application.fatherNid,
          fatherOccupation: application.fatherOccupation,
          fatherMobile: application.fatherMobile,
          motherName: application.motherName,
          motherNameBn: application.motherNameBn,
          motherNid: application.motherNid,
          motherOccupation: application.motherOccupation,
          motherMobile: application.motherMobile,
          guardianName: application.guardianName,
          guardianRelation: application.guardianRelation,
          guardianNid: application.guardianNid,
          guardianMobile: application.guardianMobile,
          localGuardianName: application.localGuardianName,
          localGuardianMobile: application.localGuardianMobile,
          localGuardianAddress: application.localGuardianAddress,
          emergencyContactName: application.emergencyContactName,
          emergencyContactPhone: application.emergencyContactPhone,
          monthlyFamilyIncome: application.monthlyFamilyIncome,
          presentAddress: application.presentAddress,
          presentDivisionId: application.presentDivisionId,
          presentDistrictId: application.presentDistrictId,
          presentUpazilaId: application.presentUpazilaId,
          permanentSameAsPresent: application.permanentSameAsPresent,
          permanentAddress: application.permanentAddress,
          permanentDivisionId: application.permanentDivisionId,
          permanentDistrictId: application.permanentDistrictId,
          permanentUpazilaId: application.permanentUpazilaId,
          documents: application.documents as any,
          allergies: application.allergies,
          medicalConditions: application.medicalConditions,
          disabilityType: application.disabilityType,
          immunizationComplete: application.immunizationComplete,
          admissionFeeAmount: application.admissionFeeAmount,
          admissionFeeSubtotal: application.admissionFeeSubtotal,
          admissionDiscountAmount: application.admissionDiscountAmount,
          admissionPayableAmount: application.admissionPayableAmount,
          discountType: application.discountType,
          discountScope: application.discountScope,
          discountValue: application.discountValue,
          discountSource: application.discountSource,
          discountReason: application.discountReason,
          referenceUserId: application.referenceUserId,
          referenceName: application.referenceName,
          referenceMobile: application.referenceMobile,
          paymentStatus: application.paymentStatus === 'paid' ? 'paid' : application.paymentStatus,
          customData: application.customData as any,
          notes: application.notes,
          createdBy: userId || null,
          updatedBy: userId || null,
        },
      });
      await tx.admissionApplication.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userId || null,
          reviewedAt: new Date(),
          reviewedBy: userId || null,
          studentId: student.id,
        },
      });
      return student;
    });

    return this.response(
      'Admission application approved successfully',
      this.normalizeApplication(createdStudent),
    );
  }

  async reject(id: string, dto: RejectAdmissionDto, userId?: string) {
    await this.findOne(id);
    const updated = await this.prisma().admissionApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: dto.rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: userId || null,
      },
      include: this.detailsInclude(),
    });
    return this.response(
      'Admission application rejected successfully',
      this.normalizeApplication(updated),
    );
  }

  async waitlist(id: string, dto: WaitlistAdmissionDto, userId?: string) {
    await this.findOne(id);
    const updated = await this.prisma().admissionApplication.update({
      where: { id },
      data: {
        status: 'waitlisted',
        waitlistRank: dto.waitlistRank || null,
        reviewedAt: new Date(),
        reviewedBy: userId || null,
      },
      include: this.detailsInclude(),
    });
    return this.response(
      'Admission application waitlisted successfully',
      this.normalizeApplication(updated),
    );
  }

  async rolls(query: any = {}) {
    const where: any = { deletedAt: null };
    if (query.sessionId) where.currentSessionId = query.sessionId;
    if (query.classId) where.classId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;
    const items = await this.prisma().student.findMany({
      where,
      select: { id: true, studentIdNo: true, fullNameEn: true, rollNumber: true },
      orderBy: [{ rollNumber: 'asc' }, { fullNameEn: 'asc' }],
    });
    return this.response('Student rolls retrieved successfully', items);
  }
}
