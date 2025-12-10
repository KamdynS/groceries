import { RateLimiterMemory } from "rate-limiter-flexible";
import type { NextRequest } from "next/server";

const limiter = new RateLimiterMemory({
	points: 60,
	duration: 60,
});

function getIp(req: NextRequest): string {
	const fwd = req.headers.get("x-forwarded-for");
	if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
	// @ts-expect-error: platform specific
	return (req as any).ip || "unknown";
}

export async function rateLimitOrThrow(req: NextRequest, keySuffix = "") {
	const key = `${getIp(req)}:${keySuffix}`;
	try {
		await limiter.consume(key, 1);
	} catch {
		const err = new Error("RATE_LIMITED");
		// @ts-expect-error add status for handlers
		err.status = 429;
		throw err;
	}
}


