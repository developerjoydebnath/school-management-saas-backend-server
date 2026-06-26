# Media and Uploads Standards

This document defines the standard patterns for handling file uploads, media storage, and static asset serving in the backend.

## 1. Static Asset Serving

- The backend serves static assets (like uploaded images) from the `public` directory.
- This is configured in `main.ts` using `app.useStaticAssets()`.
- **CRITICAL RULE**: Do not use `join(__dirname, '..', 'public')` because `__dirname` resolves to `dist/src` in the compiled build, causing it to look for `dist/public`.
- **Correct Pattern**:
```typescript
app.useStaticAssets(join(process.cwd(), 'public'), {
	prefix: '/public/',
});
```
- This ensures that assets are served correctly at `/public/uploads/...` directly from the backend root, entirely bypassing the global `/api/v1` prefix.

## 2. Upload Controllers & Multer

- Handle uploads using NestJS's built-in `@UseInterceptors(FileInterceptor('file'))`.
- Save files logically grouped by module into `public/uploads/{module_name}/global/` (for public assets) or `tenant_{id}`.
- Upload endpoints should process the image (e.g., generate a blur placeholder using sharp or base64 compression) and return the `{ url, placeholder, mediaId }`.

### Example Controller Pattern:
```typescript
@Post('uploads/image')
@UseInterceptors(FileInterceptor('file'))
async uploadImage(@UploadedFile() file: Express.Multer.File) {
	// 1. Process file and save to public/uploads/...
	// 2. Generate placeholder base64
	// 3. Return URL mapped to /public/uploads/...
	return {
		url: `/public/uploads/module_name/global/${filename}`,
		placeholder: `data:image/webp;base64,...`,
		mediaId: uuid,
	};
}
```

## 3. Database Schema for Media

- For 1-to-1 simple image attachments (like a school logo or user avatar), **store the URL and placeholder directly on the entity table** rather than creating a separate `Media` relation.
- Entity DTOs should include both fields:
```typescript
@ApiPropertyOptional()
@IsOptional()
@IsString()
logoUrl?: string;

@ApiPropertyOptional()
@IsOptional()
@IsString()
logoPlaceholder?: string;
```
- During creation or updates, directly save `logoUrl` and `logoPlaceholder` to the Prisma database.
