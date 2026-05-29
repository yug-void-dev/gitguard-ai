
/**
 * @file src/models/RepositoryRule.ts
 * @description Mongoose model for per-repository rule configuration.
 *
 * This centralized model stores named rule profiles for repositories, allowing
 * per-repo behavior such as `strict`, `security-only`, `ignore-style`, and
 * custom include/exclude patterns. Services (ruleEngine, commentService)
 * should consult these documents when deciding whether to post findings or
 * apply suggestions.
 */

import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// --- Public rule shape reused across codebase ---
export interface ICustomPattern {
	pattern: string;
	type: 'regex' | 'substring' | 'literal';
	category: 'security' | 'bug' | 'performance' | 'code-quality' | 'dependency' | 'refactoring' | 'test-coverage';
	message: string;
	severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
	action: 'flag' | 'suppress';
}
export interface IRepositoryRuleSpec {
	strictMode: boolean;          // treat any issue as actionable
	ignoreLinting: boolean;       // skip stylistic lint issues
	checkPerformance: boolean;    // include performance category findings
	minConfidence: number;        // minimum LLM confidence to include (0-1)
	allowAutoApply: boolean;      // whether one-click suggestions may be auto-applied
	ignoredPaths: string[];       // glob patterns to ignore
	onlySecurity: boolean;        // only surface security-related findings
	customPatterns?: ICustomPattern[]; // custom matching patterns
}
export interface IRepositoryRuleDoc extends Document {
	repositoryId: Types.ObjectId; // reference to Repository
	profileName: string;          // e.g. 'default', 'strict', 'security-only'
	spec: IRepositoryRuleSpec;    // actual rule configuration
	version: number;              // increment when rules change
	isActive: boolean;            // whether profile is active
	createdAt: Date;
	updatedAt: Date;

	// Instance helper
	matchesPath(path: string): boolean;
}
const customPatternSchema = new Schema<ICustomPattern>(
	{
		pattern: { type: String, required: true },
		type: { type: String, enum: ['regex', 'substring', 'literal'], default: 'substring' },
		category: { type: String, required: true },
		message: { type: String, required: true },
		severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], default: 'medium' },
		action: { type: String, enum: ['flag', 'suppress'], default: 'flag' },
	},
	{ _id: false },
);

const repositoryRuleSpecSchema = new Schema<IRepositoryRuleSpec>(
	{
		strictMode: { type: Boolean, default: false },
		ignoreLinting: { type: Boolean, default: false },
		checkPerformance: { type: Boolean, default: true },
		minConfidence: { type: Number, default: 0.7, min: 0, max: 1 },
		allowAutoApply: { type: Boolean, default: false },
		ignoredPaths: { type: [String], default: [] },
		onlySecurity: { type: Boolean, default: false },
		customPatterns: { type: [customPatternSchema], default: [] },
	},
	{ _id: false },
);

const repositoryRuleSchema = new Schema<IRepositoryRuleDoc>(
	{
		repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
		profileName: { type: String, required: true, default: 'default' },
		spec: { type: repositoryRuleSpecSchema, default: () => ({}) },
		version: { type: Number, default: 1 },
		isActive: { type: Boolean, default: true, index: true },
	},
	{ timestamps: true, collection: 'repository_rules' },
);

// Compound unique: one profile name per repository
repositoryRuleSchema.index({ repositoryId: 1, profileName: 1 }, { unique: true });

// --- Instance methods ---

repositoryRuleSchema.methods.matchesPath = function (path: string): boolean {
	// simple glob-ish matching: treat ignoredPaths as substring or simple glob '*'
	// NOTE: We deliberately avoid new RegExp() on user-supplied strings to prevent
	// Regular Expression Denial of Service (ReDoS) attacks.
	if (!this.spec || !Array.isArray(this.spec.ignoredPaths)) return true;
	for (const p of this.spec.ignoredPaths) {
		if (!p) continue;
		if (p.includes('*')) {
			// Safe glob match: split on '*' and verify each literal segment appears
			// in order within the path — avoids dynamic RegExp construction.
			if (matchesGlob(path, p)) return false;
		} else if (path.includes(p)) {
			return false;
		}
	}
	return true;
};

/**
 * Safe glob matcher — checks if `path` matches a simple glob pattern containing '*'.
 * Splits on '*' and verifies each literal segment appears in order.
 * This avoids dynamic RegExp construction and prevents ReDoS vulnerabilities.
 */
function matchesGlob(path: string, pattern: string): boolean {
	const segments = pattern.split('*');
	let remaining = path;
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		if (seg === '') continue; // leading/trailing/consecutive wildcards
		const idx = remaining.indexOf(seg);
		if (idx === -1) return false;
		// First segment must match at the start (anchored to '^')
		if (i === 0 && idx !== 0) return false;
		remaining = remaining.slice(idx + seg.length);
	}
	// Last segment must consume to the end (anchored to '$')
	const lastSeg = segments[segments.length - 1];
	if (lastSeg !== '' && remaining.length > 0) return false;
	return true;
}

// --- Static helpers ---

/**
 * Evaluate whether a finding should be included according to a rule spec.
 * Returns true if the finding passes the rule (i.e., should be included in comments).
 */
export function evaluateFindingAgainstSpec(spec: IRepositoryRuleSpec, finding: { severity: string; confidence: number; category?: string; file?: string }): boolean {
	if (!spec) return true;

	// If only security findings are allowed
	if (spec.onlySecurity && finding.category && finding.category !== 'security') return false;

	// Confidence threshold
	if (typeof finding.confidence === 'number' && finding.confidence < spec.minConfidence) return false;

	// Linting exclusion
	if (spec.ignoreLinting && finding.category === 'code-quality') return false;

	// If strict mode, include everything above a minimal threshold
	if (spec.strictMode) return true;

	// Default allow
	return true;
}

// --- Model export ---
export const RepositoryRule: Model<IRepositoryRuleDoc> = mongoose.model<IRepositoryRuleDoc>('RepositoryRule', repositoryRuleSchema);

export default RepositoryRule;
