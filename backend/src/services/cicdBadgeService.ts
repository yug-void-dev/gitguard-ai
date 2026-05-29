/**
 * @file src/services/cicdBadgeService.ts
 * @description Service for generating Shields.io-compatible CI/CD quality badge endpoints and URLs.
 */

import { Review } from '../models/Review';
import { logger } from '../lib/logger';

export interface ShieldsIoBadge {
  schemaVersion: number;
  label: string;
  message: string;
  color: string;
  isError?: boolean;
  style?: string;
}

/**
 * Looks up the latest completed review for a repository and returns Shields.io JSON endpoint data.
 */
export async function generateBadgeData(repositoryFullName: string): Promise<ShieldsIoBadge> {
  const log = logger.child({ module: 'cicdBadgeService.generateBadgeData', repositoryFullName });

  try {
    const review = await Review.findOne({
      'repository.fullName': repositoryFullName,
      status: 'completed',
    }).sort({ createdAt: -1 });

    if (!review) {
      return {
        schemaVersion: 1,
        label: 'GitGuard AI',
        message: 'no reviews',
        color: 'lightgrey',
        style: 'flat-square',
      };
    }

    const score = review.metrics?.codeQualityScore ?? 0;
    let grade = 'F';
    let color = 'red';

    if (score >= 90) {
      grade = 'A';
      color = 'brightgreen';
    } else if (score >= 80) {
      grade = 'B';
      color = 'green';
    } else if (score >= 70) {
      grade = 'C';
      color = 'yellow';
    } else if (score >= 60) {
      grade = 'D';
      color = 'orange';
    }

    log.info({ score, grade, color }, 'Generated Shields.io badge JSON');

    return {
      schemaVersion: 1,
      label: 'GitGuard AI',
      message: `${grade} (${score}%)`,
      color,
      style: 'flat-square',
    };
  } catch (error) {
    log.error({ error }, 'Failed to generate badge data');
    return {
      schemaVersion: 1,
      label: 'GitGuard AI',
      message: 'error',
      color: 'red',
      style: 'flat-square',
    };
  }
}

/**
 * Builds and returns a direct dynamic Shields.io image URL.
 */
export async function getBadgeSvgUrl(repositoryFullName: string): Promise<string> {
  const log = logger.child({ module: 'cicdBadgeService.getBadgeSvgUrl', repositoryFullName });

  try {
    const review = await Review.findOne({
      'repository.fullName': repositoryFullName,
      status: 'completed',
    }).sort({ createdAt: -1 });

    if (!review) {
      return 'https://img.shields.io/badge/GitGuard_AI-no_reviews-lightgrey?style=flat-square';
    }

    const score = review.metrics?.codeQualityScore ?? 0;
    let grade = 'F';
    let color = 'red';

    if (score >= 90) {
      grade = 'A';
      color = 'brightgreen';
    } else if (score >= 80) {
      grade = 'B';
      color = 'green';
    } else if (score >= 70) {
      grade = 'C';
      color = 'yellow';
    } else if (score >= 60) {
      grade = 'D';
      color = 'orange';
    }

    const label = encodeURIComponent('GitGuard AI');
    const message = encodeURIComponent(`${grade} (${score}%)`);

    return `https://img.shields.io/badge/${label}-${message}-${color}?style=flat-square`;
  } catch (error) {
    log.error({ error }, 'Failed to build badge SVG URL');
    return 'https://img.shields.io/badge/GitGuard_AI-error-red?style=flat-square';
  }
}
