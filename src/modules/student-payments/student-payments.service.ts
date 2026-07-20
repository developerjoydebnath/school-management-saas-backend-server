import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';

function toNumber(value: any) {
  if (value === undefined || value === null || value === '') return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function money(value: any) {
  return Math.round(toNumber(value) * 100) / 100;
}

function parseDate(value?: string, label = 'date') {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${label} filter`);
  }
  return date;
}

@Injectable()
export class StudentPaymentsService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
  ) {}

  private prisma() {
    return this.tenantConnection.getTenantClient();
  }

  private tenantSchema() {
    const schema = this.tenantConnection.getTenantSchema();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new BadRequestException('Invalid tenant schema');
    }
    return schema;
  }

  private table(tableName: string) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new BadRequestException('Invalid table name');
    }
    return Prisma.raw(`"${this.tenantSchema()}"."${tableName}"`);
  }

  private async ensureStudentPaymentsTable(client: any = this.prisma()) {
    const schema = this.tenantSchema();
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}"."student_payments" (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        payment_no VARCHAR(40) NOT NULL UNIQUE,
        admission_application_id UUID,
        student_id UUID,
        user_id UUID,
        session_id UUID NOT NULL,
        class_id UUID,
        section_id UUID,
        purpose VARCHAR(40) NOT NULL DEFAULT 'admission_fee',
        source VARCHAR(40) NOT NULL DEFAULT 'admin_manual',
        payment_method VARCHAR(30),
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_gateway VARCHAR(50),
        gateway_provider VARCHAR(50),
        payment_id VARCHAR(100),
        transaction_id VARCHAR(100),
        receipt_no VARCHAR(60),
        original_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        required_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
        discount_applied BOOLEAN NOT NULL DEFAULT false,
        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_type VARCHAR(20),
        discount_scope VARCHAR(30),
        discount_value NUMERIC(12, 2),
        discount_source VARCHAR(30),
        discount_reason VARCHAR(255),
        paid_at TIMESTAMPTZ,
        notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by UUID,
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )
    `);

    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_admission_application_id_idx ON "${schema}"."student_payments"(admission_application_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_student_id_idx ON "${schema}"."student_payments"(student_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_user_id_idx ON "${schema}"."student_payments"(user_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_session_id_idx ON "${schema}"."student_payments"(session_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_class_id_idx ON "${schema}"."student_payments"(class_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_section_id_idx ON "${schema}"."student_payments"(section_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_payment_status_idx ON "${schema}"."student_payments"(payment_status)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_paid_at_idx ON "${schema}"."student_payments"(paid_at)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS student_payments_deleted_at_idx ON "${schema}"."student_payments"(deleted_at)`,
    );
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private split(value?: string) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private joins() {
    return Prisma.sql`
      FROM ${this.table('student_payments')} sp
      LEFT JOIN ${this.table('admission_applications')} aa ON aa.id = sp.admission_application_id
      LEFT JOIN ${this.table('students')} st ON st.id = sp.student_id
      LEFT JOIN ${this.table('classes')} c ON c.id = sp.class_id
      LEFT JOIN ${this.table('sections')} sec ON sec.id = sp.section_id
    `;
  }

  private listColumns() {
    return Prisma.sql`
      sp.id,
      sp.payment_no AS "paymentNo",
      sp.purpose,
      sp.source,
      sp.payment_method AS "paymentMethod",
      sp.payment_status AS "paymentStatus",
      sp.paid_amount AS "paidAmount",
      sp.required_amount AS "requiredAmount",
      sp.due_amount AS "dueAmount",
      sp.discount_amount AS "discountAmount",
      sp.paid_at AS "paidAt",
      sp.created_at AS "createdAt",
      sp.transaction_id AS "transactionId",
      aa.id AS "admissionApplicationId",
      aa.application_no AS "applicationNo",
      aa.student_name_en AS "applicationStudentName",
      aa.father_mobile AS "applicationFatherMobile",
      st.id AS "studentId",
      st.student_id_no AS "studentIdNo",
      st.full_name_en AS "studentFullName",
      st.father_mobile AS "studentFatherMobile",
      c.id AS "classId",
      c.en_name AS "className",
      c.bn_name AS "classNameBn",
      sec.id AS "sectionId",
      sec.name AS "sectionName"
    `;
  }

  private normalizeRaw(item: any) {
    if (!item) return item;
    return {
      ...item,
      studentName: item.studentFullName || item.applicationStudentName || '-',
      studentCode: item.studentIdNo || item.applicationNo || null,
      contact: item.studentFatherMobile || item.applicationFatherMobile || null,
      className: item.className || null,
      sectionName: item.sectionName || null,
      paidAmount: toNumber(item.paidAmount),
      requiredAmount: toNumber(item.requiredAmount),
      dueAmount: toNumber(item.dueAmount),
      discountAmount: toNumber(item.discountAmount),
      originalAmount:
        item.originalAmount === undefined ? undefined : toNumber(item.originalAmount),
      discountValue:
        item.discountValue === undefined || item.discountValue === null
          ? item.discountValue
          : toNumber(item.discountValue),
    };
  }

  private buildWhere(query: any = {}) {
    const clauses: Prisma.Sql[] = [Prisma.sql`sp.deleted_at IS NULL`];

    if (query.search) {
      const search = `%${query.search}%`;
      clauses.push(Prisma.sql`(
        sp.payment_no ILIKE ${search}
        OR sp.transaction_id ILIKE ${search}
        OR sp.receipt_no ILIKE ${search}
        OR aa.student_name_en ILIKE ${search}
        OR st.full_name_en ILIKE ${search}
        OR st.student_id_no ILIKE ${search}
      )`);
    }

    if (query.sessionId) clauses.push(Prisma.sql`sp.session_id = ${query.sessionId}::uuid`);
    if (query.classId) clauses.push(Prisma.sql`sp.class_id = ${query.classId}::uuid`);
    if (query.sectionId) clauses.push(Prisma.sql`sp.section_id = ${query.sectionId}::uuid`);
    if (query.studentId) clauses.push(Prisma.sql`sp.student_id = ${query.studentId}::uuid`);
    if (query.admissionApplicationId) {
      clauses.push(
        Prisma.sql`sp.admission_application_id = ${query.admissionApplicationId}::uuid`,
      );
    }
    if (query.source) {
      clauses.push(Prisma.sql`sp.source IN (${Prisma.join(this.split(query.source))})`);
    }
    if (query.purpose) {
      clauses.push(Prisma.sql`sp.purpose IN (${Prisma.join(this.split(query.purpose))})`);
    }
    if (query.paymentMethod) {
      clauses.push(
        Prisma.sql`sp.payment_method IN (${Prisma.join(this.split(query.paymentMethod))})`,
      );
    }
    if (query.paymentStatus) {
      clauses.push(
        Prisma.sql`sp.payment_status IN (${Prisma.join(this.split(query.paymentStatus))})`,
      );
    }
    if (query.dateFrom) {
      clauses.push(Prisma.sql`sp.paid_at >= ${parseDate(query.dateFrom, 'dateFrom')}`);
    }
    if (query.dateTo) {
      clauses.push(Prisma.sql`sp.paid_at <= ${parseDate(query.dateTo, 'dateTo')}`);
    }

    return Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}`;
  }

  private async nextPaymentNo(tx: any, paidAt?: Date | null) {
    const year = (paidAt || new Date()).getFullYear();
    const rows = (await tx.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM ${this.table('student_payments')}
      WHERE payment_no LIKE ${`SP-${year}-%`}
    `)) as Array<{ count: bigint }>;
    const count = Number(rows[0]?.count || 0);
    return `SP-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(query: any = {}) {
    await this.ensureStudentPaymentsTable();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const offset = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [items, countRows] = await Promise.all([
      this.prisma().$queryRaw<any[]>(Prisma.sql`
        SELECT ${this.listColumns()}
        ${this.joins()}
        ${where}
        ORDER BY sp.paid_at DESC NULLS LAST, sp.created_at DESC, sp.id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      this.prisma().$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        ${this.joins()}
        ${where}
      `),
    ]);

    const total = Number(countRows[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    return this.response('Student payments retrieved successfully', {
      items: items.map((item) => this.normalizeRaw(item)),
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
    await this.ensureStudentPaymentsTable();
    const rows = await this.prisma().$queryRaw<any[]>(Prisma.sql`
      SELECT
        ${this.listColumns()},
        sp.payment_gateway AS "paymentGateway",
        sp.gateway_provider AS "gatewayProvider",
        sp.payment_id AS "paymentId",
        sp.receipt_no AS "receiptNo",
        sp.original_amount AS "originalAmount",
        sp.currency,
        sp.discount_applied AS "discountApplied",
        sp.discount_type AS "discountType",
        sp.discount_scope AS "discountScope",
        sp.discount_value AS "discountValue",
        sp.discount_source AS "discountSource",
        sp.discount_reason AS "discountReason",
        sp.notes,
        sp.metadata,
        sp.created_by AS "createdBy",
        sp.updated_by AS "updatedBy",
        aa.father_name AS "applicationFatherName",
        aa.payment_status AS "applicationPaymentStatus",
        aa.source AS "applicationSource",
        st.father_name AS "studentFatherName",
        st.roll_number AS "rollNumber"
      ${this.joins()}
      WHERE sp.id = ${id}::uuid AND sp.deleted_at IS NULL
      LIMIT 1
    `);

    const payment = rows[0];
    if (!payment) throw new NotFoundException('Student payment not found');

    const userNames = await this.userNameMap([payment.createdBy, payment.updatedBy]);
    return this.response('Student payment retrieved successfully', {
      ...this.normalizeRaw(payment),
      createdByName: userNames.get(payment.createdBy || '') || null,
      updatedByName: userNames.get(payment.updatedBy || '') || null,
    });
  }

  async userNameMap(userIds: Array<string | null | undefined>) {
    const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
    const map = new Map<string, string>();
    if (!ids.length) return map;
    const profiles = await this.prismaService.client.userProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, firstName: true, lastName: true },
    });
    for (const profile of profiles) {
      map.set(
        profile.userId,
        [profile.firstName, profile.lastName].filter(Boolean).join(' '),
      );
    }
    return map;
  }

  async recordAdmissionPayment(
    tx: any,
    application: any,
    userId?: string,
    paidDelta?: number,
  ) {
    const paidAmount = money(paidDelta ?? application.admissionFeeAmount);
    if (paidAmount <= 0) return null;
    await this.ensureStudentPaymentsTable(tx);

    const payableAmount = money(application.admissionPayableAmount);
    const originalAmount = money(application.admissionFeeSubtotal ?? payableAmount);
    const existingPaid =
      paidDelta === undefined ? 0 : money(application.admissionFeeAmount) - paidAmount;
    const dueAmount = Math.max(payableAmount - existingPaid - paidAmount, 0);
    const paidAt = application.paidAt ? new Date(application.paidAt) : new Date();
    const paymentNo = await this.nextPaymentNo(tx, paidAt);
    const metadata = {
      applicationNo: application.applicationNo,
      studentName: application.studentNameEn,
      fatherMobile: application.fatherMobile,
    };

    const rows = (await tx.$queryRaw(Prisma.sql`
      INSERT INTO ${this.table('student_payments')} (
        payment_no,
        admission_application_id,
        student_id,
        user_id,
        session_id,
        class_id,
        section_id,
        purpose,
        source,
        payment_method,
        payment_status,
        payment_gateway,
        gateway_provider,
        payment_id,
        transaction_id,
        original_amount,
        required_amount,
        paid_amount,
        due_amount,
        discount_applied,
        discount_amount,
        discount_type,
        discount_scope,
        discount_value,
        discount_source,
        discount_reason,
        paid_at,
        metadata,
        created_by,
        updated_by
      )
      VALUES (
        ${paymentNo},
        ${application.id}::uuid,
        ${application.studentId || null}::uuid,
        ${null}::uuid,
        ${application.sessionId}::uuid,
        ${application.applyingClassId}::uuid,
        ${application.sectionId || null}::uuid,
        ${'admission_fee'},
        ${application.source || 'admin_manual'},
        ${application.paymentMethod || null},
        ${application.paymentStatus || (dueAmount > 0 ? 'partial' : 'paid')},
        ${application.paymentGateway || null},
        ${application.gatewayProvider || null},
        ${application.paymentId || null},
        ${application.transactionId || null},
        ${originalAmount},
        ${payableAmount},
        ${paidAmount},
        ${dueAmount},
        ${money(application.admissionDiscountAmount) > 0},
        ${money(application.admissionDiscountAmount)},
        ${application.discountType || null},
        ${application.discountScope || null},
        ${application.discountValue || null},
        ${application.discountSource || null},
        ${application.discountReason || null},
        ${paidAt},
        ${JSON.stringify(metadata)}::jsonb,
        ${userId || null}::uuid,
        ${userId || null}::uuid
      )
      RETURNING id, payment_no AS "paymentNo"
    `)) as any[];

    return rows[0] || null;
  }
}
