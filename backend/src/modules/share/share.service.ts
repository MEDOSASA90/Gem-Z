/**
 * GEM Z — Social Sharing Service
 *
 * OG image generation for shareable achievements using Canvas + Sharp.
 * Features:
 *   - Generate achievement share cards
 *   - Create OG meta tag images for social platforms
 *   - Track share link analytics
 *   - Platform-specific image optimization (FB, IG, TikTok, WhatsApp)
 */

import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas';
import sharp from 'sharp';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';
import path from 'path';
import fs from 'fs/promises';

const log = createLogger('share');

// ─── Types ──────────────────────────────────────────────────────

export interface ShareLink {
    id: string;
    userId: string;
    type: 'achievement' | 'workout' | 'progress' | 'challenge';
    title: string;
    subtitle?: string;
    metric?: string;
    metricLabel?: string;
    imageUrl?: string;
    bgGradient?: string;
    createdAt: Date;
    shareCount: number;
}

export interface OGImageResult {
    url: string;
    width: number;
    height: number;
    sizeBytes: number;
}

export interface ShareAnalytics {
    totalShares: number;
    sharesByPlatform: Record<string, number>;
    sharesByType: Record<string, number>;
    topShared: Array<{ id: string; title: string; count: number }>;
}

export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'twitter' | 'copy';

export interface ShareOptions {
    platform: Platform;
    title?: string;
    description?: string;
    imageUrl?: string;
    url?: string;
}

// ─── Constants ──────────────────────────────────────────────────

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const SQUARE_IMAGE_SIZE = 1080; // For Instagram
const STORY_IMAGE_WIDTH = 1080;
const STORY_IMAGE_HEIGHT = 1920;

const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
    facebook: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
    twitter: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
    whatsapp: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
    instagram: { width: SQUARE_IMAGE_SIZE, height: SQUARE_IMAGE_SIZE },
    tiktok: { width: STORY_IMAGE_WIDTH, height: STORY_IMAGE_HEIGHT },
    copy: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
};

const GRADIENT_PRESETS: Record<string, [string, string]> = {
    gold: ['#FFD700', '#FF8C00'],
    purple: ['#8B5CF6', '#6D28D9'],
    blue: ['#3B82F6', '#1E40AF'],
    green: ['#10B981', '#047857'],
    red: ['#EF4444', '#B91C1C'],
    orange: ['#F59E0B', '#D97706'],
    neon: ['#C0FF00', '#00D4FF'],
    dark: ['#1a1a2e', '#16213e'],
};

// ─── Public API ─────────────────────────────────────────────────

/**
 * Generate a shareable OG image for an achievement or milestone.
 *
 * @param userId - User ID creating the share
 * @param type - Type of share content
 * @param title - Main title text
 * @param subtitle - Optional subtitle
 * @param metric - Optional metric value (e.g. "50")
 * @param metricLabel - Optional metric label (e.g. "Workouts Completed")
 * @param gradientKey - Gradient preset key
 * @returns Generated image URL and metadata
 */
export async function generateShareImage(
    userId: string,
    type: ShareLink['type'],
    title: string,
    subtitle?: string,
    metric?: string,
    metricLabel?: string,
    gradientKey: string = 'neon'
): Promise<OGImageResult> {
    if (!title || title.trim().length === 0) {
        throw new ValidationError('Title is required for share image', ErrorCode.INVALID_INPUT);
    }

    const gradient = GRADIENT_PRESETS[gradientKey] || GRADIENT_PRESETS.neon;
    const shareId = generateShareId();
    const filename = `share_${shareId}.png`;
    const uploadDir = path.join(config.upload.path, 'shares');
    const filePath = path.join(uploadDir, filename);

    try {
        // Ensure upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate the canvas image
        const canvas = createCanvas(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);
        const ctx = canvas.getContext('2d');

        // Draw background gradient
        drawGradientBackground(ctx, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, gradient);

        // Draw decorative elements
        drawDecorativeCircles(ctx, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);

        // Draw GEM Z logo area
        drawHeader(ctx, OG_IMAGE_WIDTH);

        // Draw main content
        drawContent(ctx, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, title, subtitle, metric, metricLabel);

        // Draw footer branding
        drawFooter(ctx, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);

        // Convert to buffer and optimize with Sharp
        const buffer = canvas.toBuffer('image/png');
        const optimizedBuffer = await sharp(buffer)
            .png({ quality: 90, compressionLevel: 8 })
            .toBuffer();

        await fs.writeFile(filePath, optimizedBuffer);

        // Save share link record to DB
        const publicUrl = `${config.apiUrl}/uploads/shares/${filename}`;
        await db.query(
            `INSERT INTO share_links (id, user_id, type, title, subtitle, metric, metric_label, image_url, gradient)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [shareId, userId, type, title, subtitle || null, metric || null, metricLabel || null, publicUrl, gradientKey]
        );

        const stats = await fs.stat(filePath);

        log.info({ shareId, userId, type, size: stats.size }, 'Share image generated');

        return {
            url: publicUrl,
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
            sizeBytes: stats.size,
        };
    } catch (error) {
        log.error({ error: (error as Error).message, userId, type }, 'Failed to generate share image');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to generate share image', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Generate a platform-specific optimized share image.
 * Instagram needs square, TikTok needs story format, etc.
 *
 * @param shareId - Existing share ID
 * @param platform - Target platform
 * @returns Optimized image URL and dimensions
 */
export async function generatePlatformImage(
    shareId: string,
    platform: Platform
): Promise<OGImageResult> {
    const dims = PLATFORM_DIMENSIONS[platform];
    if (!dims) {
        throw new ValidationError(`Unsupported platform: ${platform}`, ErrorCode.INVALID_INPUT);
    }

    const result = await db.query(
        `SELECT * FROM share_links WHERE id = $1`,
        [shareId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Share link not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const share = result.rows[0];
    const gradient = GRADIENT_PRESETS[share.gradient] || GRADIENT_PRESETS.neon;
    const filename = `share_${shareId}_${platform}.png`;
    const uploadDir = path.join(config.upload.path, 'shares');
    const filePath = path.join(uploadDir, filename);

    try {
        await fs.mkdir(uploadDir, { recursive: true });

        const canvas = createCanvas(dims.width, dims.height);
        const ctx = canvas.getContext('2d');

        // Draw background
        drawGradientBackground(ctx, dims.width, dims.height, gradient);
        drawDecorativeCircles(ctx, dims.width, dims.height);
        drawHeader(ctx, dims.width);

        // Adjust content for aspect ratio
        if (platform === 'tiktok') {
            drawStoryContent(ctx, dims.width, dims.height, share.title, share.subtitle, share.metric, share.metric_label);
        } else if (platform === 'instagram') {
            drawSquareContent(ctx, dims.width, dims.height, share.title, share.subtitle, share.metric, share.metric_label);
        } else {
            drawContent(ctx, dims.width, dims.height, share.title, share.subtitle, share.metric, share.metric_label);
        }

        drawFooter(ctx, dims.width, dims.height);

        const buffer = canvas.toBuffer('image/png');
        const optimizedBuffer = await sharp(buffer)
            .png({ quality: 92, compressionLevel: 8 })
            .toBuffer();

        await fs.writeFile(filePath, optimizedBuffer);
        const stats = await fs.stat(filePath);

        const publicUrl = `${config.apiUrl}/uploads/shares/${filename}`;

        log.info({ shareId, platform, size: stats.size }, 'Platform share image generated');

        return {
            url: publicUrl,
            width: dims.width,
            height: dims.height,
            sizeBytes: stats.size,
        };
    } catch (error) {
        log.error({ error: (error as Error).message, shareId, platform }, 'Failed to generate platform image');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to generate platform image', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Record a share event for analytics tracking.
 *
 * @param shareId - Share link ID
 * @param platform - Platform shared to
 * @param ipAddress - Optional IP for geo tracking
 */
export async function recordShare(
    shareId: string,
    platform: Platform,
    ipAddress?: string
): Promise<void> {
    try {
        await db.query(
            `UPDATE share_links SET share_count = share_count + 1 WHERE id = $1`,
            [shareId]
        );

        await db.query(
            `INSERT INTO share_analytics (share_id, platform, ip_address, shared_at)
             VALUES ($1, $2, $3, NOW())`,
            [shareId, platform, ipAddress || null]
        );

        log.info({ shareId, platform }, 'Share recorded');
    } catch (error) {
        log.error({ error: (error as Error).message, shareId, platform }, 'Failed to record share');
    }
}

/**
 * Get share analytics for a user.
 *
 * @param userId - User ID
 * @returns Aggregated analytics data
 */
export async function getUserShareAnalytics(userId: string): Promise<ShareAnalytics> {
    try {
        const totalResult = await db.query(
            `SELECT COALESCE(SUM(share_count), 0) as total FROM share_links WHERE user_id = $1`,
            [userId]
        );

        const platformResult = await db.query(
            `SELECT platform, COUNT(*) as count FROM share_analytics sa
             JOIN share_links sl ON sa.share_id = sl.id
             WHERE sl.user_id = $1 GROUP BY platform`,
            [userId]
        );

        const typeResult = await db.query(
            `SELECT type, SUM(share_count) as count FROM share_links
             WHERE user_id = $1 GROUP BY type`,
            [userId]
        );

        const topResult = await db.query(
            `SELECT id, title, share_count FROM share_links
             WHERE user_id = $1 ORDER BY share_count DESC LIMIT 5`,
            [userId]
        );

        const sharesByPlatform: Record<string, number> = {};
        for (const row of platformResult.rows) {
            sharesByPlatform[row.platform] = Number(row.count);
        }

        const sharesByType: Record<string, number> = {};
        for (const row of typeResult.rows) {
            sharesByType[row.type] = Number(row.count);
        }

        return {
            totalShares: Number(totalResult.rows[0]?.total || 0),
            sharesByPlatform,
            sharesByType,
            topShared: topResult.rows.map(r => ({ id: r.id, title: r.title, count: Number(r.share_count) })),
        };
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to get share analytics');
        throw new ServerError('Failed to retrieve share analytics', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get a share link by ID.
 *
 * @param shareId - Share link ID
 * @returns Share link data
 */
export async function getShareLink(shareId: string): Promise<ShareLink> {
    const result = await db.query(
        `SELECT * FROM share_links WHERE id = $1`,
        [shareId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Share link not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = result.rows[0];
    return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        subtitle: row.subtitle,
        metric: row.metric,
        metricLabel: row.metric_label,
        imageUrl: row.image_url,
        bgGradient: row.gradient,
        createdAt: row.created_at,
        shareCount: Number(row.share_count),
    };
}

/**
 * Delete a share link and its associated image files.
 *
 * @param shareId - Share ID
 * @param userId - User ID (for authorization)
 */
export async function deleteShareLink(shareId: string, userId: string): Promise<void> {
    const result = await db.query(
        `SELECT user_id, image_url FROM share_links WHERE id = $1`,
        [shareId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Share link not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    if (result.rows[0].user_id !== userId) {
        throw new AppError('Not authorized to delete this share', 403, ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }

    try {
        // Delete associated image files
        const uploadDir = path.join(config.upload.path, 'shares');
        const platforms = ['facebook', 'instagram', 'tiktok', 'whatsapp', 'twitter', 'copy'];

        await fs.unlink(path.join(uploadDir, `share_${shareId}.png`)).catch(() => {});
        for (const platform of platforms) {
            await fs.unlink(path.join(uploadDir, `share_${shareId}_${platform}.png`)).catch(() => {});
        }

        await db.query(`DELETE FROM share_links WHERE id = $1`, [shareId]);

        log.info({ shareId, userId }, 'Share link deleted');
    } catch (error) {
        log.error({ error: (error as Error).message, shareId }, 'Failed to delete share link');
        throw new ServerError('Failed to delete share link', ErrorCode.SERVER_ERROR);
    }
}

// ─── Canvas Drawing Helpers ─────────────────────────────────────

function drawGradientBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    gradient: [string, string]
): void {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, gradient[0]);
    grad.addColorStop(1, gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add subtle noise texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const s = Math.random() * 2;
        ctx.fillRect(x, y, s, s);
    }
}

function drawDecorativeCircles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;

    // Large circle top-right
    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.2, 180, 0, Math.PI * 2);
    ctx.stroke();

    // Medium circle bottom-left
    ctx.beginPath();
    ctx.arc(width * 0.1, height * 0.85, 120, 0, Math.PI * 2);
    ctx.stroke();

    // Small circles
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.75, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.15, 40, 0, Math.PI * 2);
    ctx.stroke();
}

function drawHeader(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, 80);

    ctx.fillStyle = '#C0FF00';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GEM Z', 40, 52);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('Fitness Ecosystem', 140, 52);
}

function drawContent(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    title: string,
    subtitle?: string | null,
    metric?: string | null,
    metricLabel?: string | null
): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw metric circle if metric provided
    if (metric) {
        ctx.beginPath();
        ctx.arc(centerX, centerY - 40, 100, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#C0FF00';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 56px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(metric, centerX, centerY - 50);

        if (metricLabel) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '20px Arial, sans-serif';
            ctx.fillText(metricLabel, centerX, centerY - 5);
        }
    }

    // Draw title
    const titleY = metric ? centerY + 100 : centerY - 20;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Wrap title if too long
    const maxWidth = width - 100;
    wrapText(ctx, title, centerX, titleY, maxWidth, 58);

    // Draw subtitle
    if (subtitle) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '28px Arial, sans-serif';
        wrapText(ctx, subtitle, centerX, titleY + 80, maxWidth, 36);
    }
}

function drawSquareContent(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    title: string,
    subtitle?: string | null,
    metric?: string | null,
    metricLabel?: string | null
): void {
    const centerX = width / 2;
    const centerY = height / 2;

    if (metric) {
        ctx.beginPath();
        ctx.arc(centerX, centerY - 60, 130, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#C0FF00';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 72px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(metric, centerX, centerY - 70);

        if (metricLabel) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '24px Arial, sans-serif';
            ctx.fillText(metricLabel, centerX, centerY - 15);
        }
    }

    const titleY = metric ? centerY + 120 : centerY;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, title, centerX, titleY, width - 80, 52);

    if (subtitle) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '24px Arial, sans-serif';
        wrapText(ctx, subtitle, centerX, titleY + 80, width - 80, 32);
    }
}

function drawStoryContent(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    title: string,
    subtitle?: string | null,
    metric?: string | null,
    metricLabel?: string | null
): void {
    const centerX = width / 2;

    if (metric) {
        ctx.beginPath();
        ctx.arc(centerX, height * 0.35, 150, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#C0FF00';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 80px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(metric, centerX, height * 0.33);

        if (metricLabel) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '28px Arial, sans-serif';
            ctx.fillText(metricLabel, centerX, height * 0.42);
        }
    }

    const titleY = metric ? height * 0.58 : height * 0.45;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, title, centerX, titleY, width - 80, 54);

    if (subtitle) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '26px Arial, sans-serif';
        wrapText(ctx, subtitle, centerX, titleY + 100, width - 80, 34);
    }
}

function drawFooter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, height - 60, width, 60);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Download GEM Z  |  www.gemz.fitness', width / 2, height - 30);
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[i] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currentY);
}

function generateShareId(): string {
    return `shr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Share URL Builders ─────────────────────────────────────────

/**
 * Build a native share URL for a given platform.
 */
export function buildShareUrl(options: ShareOptions): string {
    const { platform, title = '', description = '', url = config.clientUrl } = options;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDesc = encodeURIComponent(description || '');

    switch (platform) {
        case 'facebook':
            return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
        case 'twitter':
            return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        case 'whatsapp':
            return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        case 'instagram':
            // Instagram doesn't have a web sharing API, return the URL
            return url;
        case 'tiktok':
            // TikTok doesn't have direct web share, return the URL
            return url;
        case 'copy':
            return url;
        default:
            return url;
    }
}
