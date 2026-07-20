export class StudentPaymentQueryDto {
  page?: string;
  limit?: string;
  search?: string;
  sessionId?: string;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  admissionApplicationId?: string;
  source?: string;
  purpose?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

