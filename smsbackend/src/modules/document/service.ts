import { StudentDocumentStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { uploadToCloudinary } from '../../middlewares/upload.middleware';
import { deleteCloudinaryFile } from '../../config/cloudinary';

export class DocumentService {
  async list(studentId: string) {
    await this.assertStudent(studentId);
    const documents = await prisma.studentDocument.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } });
    const now = new Date();
    const expired = documents.filter((document) => document.expiresAt && document.expiresAt < now && document.status !== StudentDocumentStatus.EXPIRED);
    if (expired.length) {
      await prisma.studentDocument.updateMany({ where: { id: { in: expired.map((document) => document.id) } }, data: { status: StudentDocumentStatus.EXPIRED } });
      return documents.map((document) => expired.some((item) => item.id === document.id) ? { ...document, status: StudentDocumentStatus.EXPIRED } : document);
    }
    return documents;
  }

  async upload(studentId: string, data: { title: string; category: string; expiresAt?: Date }, file: Express.Multer.File | undefined, actorId: string) {
    await this.assertStudent(studentId);
    if (!file) throw AppError.badRequest('A document file is required');
    const uploaded = await uploadToCloudinary(file.buffer, `student-documents/${studentId}`, 'raw');
    return prisma.studentDocument.create({ data: { studentId, title: data.title, category: data.category, expiresAt: data.expiresAt, fileUrl: uploaded.url, filePublicId: uploaded.publicId, fileName: file.originalname, fileType: file.mimetype, fileSize: file.size, uploadedById: actorId } });
  }

  async review(documentId: string, status: 'VERIFIED' | 'REJECTED', reviewNotes: string | undefined, actorId: string) {
    const document = await prisma.studentDocument.findUnique({ where: { id: documentId } });
    if (!document) throw AppError.notFound('Student document not found');
    if (document.expiresAt && document.expiresAt < new Date()) throw AppError.badRequest('Expired documents cannot be verified');
    return prisma.studentDocument.update({ where: { id: documentId }, data: { status, reviewNotes, reviewedById: actorId, reviewedAt: new Date() } });
  }

  async remove(documentId: string) {
    const document = await prisma.studentDocument.findUnique({ where: { id: documentId } });
    if (!document) throw AppError.notFound('Student document not found');
    await deleteCloudinaryFile(document.filePublicId);
    await prisma.studentDocument.delete({ where: { id: documentId } });
  }

  private async assertStudent(studentId: string) {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, select: { id: true, deletedAt: true } });
    if (!student || student.deletedAt) throw AppError.notFound('Active student not found');
  }
}
