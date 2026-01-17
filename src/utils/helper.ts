export function generateUUID() {
	if (crypto.randomUUID) {
		return crypto.randomUUID();
	}

	return `${1e7}-1e3-4e3-8e3-1e11`.replace(/[018]/g, (c) =>
		(
			Number(c) ^
			(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
		).toString(16),
	);
}

export type SplitTextType = "paragraph" | "dot" | "comma" | "space";

export interface SplitTextResult {
	text: string;
	type: SplitTextType;
}

// Cấu trúc dữ liệu lồng nhau
// Dot, Comma, Space là ngang hàng và nằm trong ParagraphSegment
export interface SpaceSegment {
	text: string;
	type: "space";
	id: string;
}

export interface CommaSegment {
	text: string;
	type: "comma";
	id: string;
}

export interface DotSegment {
	text: string;
	type: "dot";
	id: string;
}

// Union type cho các segment con của Paragraph
export type ParagraphChildSegment = DotSegment | CommaSegment | SpaceSegment;

export interface ParagraphSegment {
	text: string;
	type: "paragraph";
	segments: ParagraphChildSegment[];
	id: string;
}

export type NestedSplitTextResult = ParagraphSegment[];

/**
 * Phân tách một đoạn text dài thành mảng các đoạn text nhỏ hơn
 * theo cấu trúc phân cấp: Paragraph -> Dot -> Comma -> Space
 *
 * @param text - Đoạn text cần phân tách
 * @param minLength - Giá trị tối thiểu (độ dài tối đa cho mỗi đoạn)
 * @returns Mảng các object chứa text và type phân loại
 */
export function splitText(text: string, minLength: number): SplitTextResult[] {
	if (!text || typeof text !== "string") {
		return [];
	}

	if (minLength <= 0) {
		const trimmed = text.trim();
		return trimmed.length > 0
			? [{ text: trimmed, type: "space" as SplitTextType }]
			: [];
	}

	const result: SplitTextResult[] = [];

	/**
	 * Xử lý các đoạn Dot (split theo dấu chấm)
	 */
	function processDotSegments(paragraph: string): void {
		const trimmed = paragraph.trim();
		if (!trimmed) return;

		// Nếu đoạn đã đạt yêu cầu, thêm vào kết quả
		if (trimmed.length <= minLength) {
			result.push({ text: trimmed, type: "dot" });
			return;
		}

		// Split theo dấu chấm
		const periodRegex = /\.(?=\s|$)/g;
		const periodMatches = [...trimmed.matchAll(periodRegex)];

		if (periodMatches.length > 0) {
			const dotSegments: string[] = [];
			let lastIndex = 0;

			for (const match of periodMatches) {
				const pos = match.index!;
				const beforePeriod = trimmed.substring(lastIndex, pos).trim();
				if (beforePeriod) {
					dotSegments.push(`${beforePeriod}.`); // Thêm dấu chấm vào cuối
				}
				lastIndex = pos + 1;
			}

			// Phần còn lại sau dấu chấm cuối cùng
			const remaining = trimmed.substring(lastIndex).trim();
			if (remaining) {
				dotSegments.push(remaining);
			}

			// Xử lý từng đoạn Dot
			dotSegments.forEach((dotSeg) => {
				const trimmedDot = dotSeg.trim();
				if (trimmedDot) {
					if (trimmedDot.length <= minLength) {
						result.push({ text: trimmedDot, type: "dot" });
					} else {
						// Nếu vẫn dài, tiếp tục split theo dấu phẩy
						processCommaSegments(trimmedDot);
					}
				}
			});
		} else {
			// Không có dấu chấm, tiếp tục split theo dấu phẩy
			processCommaSegments(trimmed);
		}
	}

	/**
	 * Xử lý các đoạn Comma (split theo dấu phẩy)
	 */
	function processCommaSegments(dotSegment: string): void {
		const trimmed = dotSegment.trim();
		if (!trimmed) return;

		// Nếu đoạn đã đạt yêu cầu, thêm vào kết quả
		if (trimmed.length <= minLength) {
			result.push({ text: trimmed, type: "comma" });
			return;
		}

		// Split theo dấu phẩy
		const commaRegex = /,(?=\s|$)/g;
		const commaMatches = [...trimmed.matchAll(commaRegex)];

		if (commaMatches.length > 0) {
			const commaSegments: string[] = [];
			let lastIndex = 0;

			for (const match of commaMatches) {
				const pos = match.index!;
				const beforeComma = trimmed.substring(lastIndex, pos).trim();
				if (beforeComma) {
					commaSegments.push(`${beforeComma},`); // Thêm dấu phẩy vào cuối
				}
				lastIndex = pos + 1;
			}

			// Phần còn lại sau dấu phẩy cuối cùng
			const remaining = trimmed.substring(lastIndex).trim();
			if (remaining) {
				commaSegments.push(remaining);
			}

			// Xử lý từng đoạn Comma
			commaSegments.forEach((commaSeg) => {
				const trimmedComma = commaSeg.trim();
				if (trimmedComma) {
					if (trimmedComma.length <= minLength) {
						result.push({ text: trimmedComma, type: "comma" });
					} else {
						// Nếu vẫn dài, tiếp tục split theo khoảng trắng
						processSpaceSegments(trimmedComma);
					}
				}
			});
		} else {
			// Không có dấu phẩy, tiếp tục split theo khoảng trắng
			processSpaceSegments(trimmed);
		}
	}

	/**
	 * Xử lý các đoạn Space (split theo khoảng trắng)
	 */
	function processSpaceSegments(commaSegment: string): void {
		const trimmed = commaSegment.trim();
		if (!trimmed) return;

		// Nếu đoạn đã đạt yêu cầu, thêm vào kết quả
		if (trimmed.length <= minLength) {
			result.push({ text: trimmed, type: "space" });
			return;
		}

		// Split theo khoảng trắng
		const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

		if (words.length === 0) {
			// Nếu không có từ nào, thêm toàn bộ đoạn (có thể là một từ rất dài)
			result.push({ text: trimmed, type: "space" });
			return;
		}

		let currentChunk = "";

		for (const word of words) {
			const testChunk = currentChunk ? `${currentChunk} ${word}` : word;

			if (testChunk.length <= minLength - 1) {
				currentChunk = testChunk;
			} else {
				if (currentChunk) {
					result.push({ text: currentChunk, type: "space" });
				}
				currentChunk = word;
			}
		}

		if (currentChunk) {
			result.push({ text: currentChunk, type: "space" });
		}
	}

	/**
	 * Xử lý các đoạn Paragraph (split theo \n)
	 */
	function processParagraphSegments(fullText: string): void {
		const trimmed = fullText.trim();
		if (!trimmed) return;

		// Split theo \n để tạo mảng Paragraph
		const paragraphSegments = trimmed
			.split("\n")
			.filter((seg) => seg.trim().length > 0);

		paragraphSegments.forEach((paragraph) => {
			const trimmedParagraph = paragraph.trim();
			if (!trimmedParagraph) return;

			// Nếu Paragraph đã đạt yêu cầu, thêm vào kết quả
			if (trimmedParagraph.length <= minLength) {
				result.push({ text: trimmedParagraph, type: "paragraph" });
			} else {
				// Nếu Paragraph dài hơn, tiếp tục split theo dấu chấm
				processDotSegments(trimmedParagraph);
			}
		});
	}

	// Bắt đầu xử lý từ đoạn text gốc
	processParagraphSegments(text);

	// Lọc bỏ các đoạn rỗng và trả về
	return result.filter((seg) => seg.text.trim().length > 0);
}

/**
 * Phân tách một đoạn text dài thành cấu trúc lồng nhau:
 * Paragraph -> [Dot, Comma, Space] (Dot, Comma, Space là ngang hàng)
 *
 * @param text - Đoạn text cần phân tách
 * @param minLength - Giá trị tối thiểu (độ dài tối đa cho mỗi đoạn)
 * @returns Mảng ParagraphSegment chứa các segment ngang hàng (Dot, Comma, Space)
 */
export function splitTextNested(
	text: string,
	minLength: number,
): NestedSplitTextResult {
	if (!text || typeof text !== "string") {
		return [];
	}

	if (minLength <= 0) {
		const trimmed = text.trim();
		if (trimmed.length === 0) return [];
		return [
			{
				text: trimmed,
				type: "paragraph",
				segments: [],
				id: generateUUID(),
			},
		];
	}

	/**
	 * Xử lý một đoạn text và trả về mảng các segment (Dot, Comma, Space)
	 */
	function processSegment(segmentText: string): ParagraphChildSegment[] {
		const trimmed = segmentText.trim();
		if (!trimmed) return [];

		const segments: ParagraphChildSegment[] = [];

		// Bước 1: Thử split theo dấu chấm "."
		const periodRegex = /\.(?=\s|$)/g;
		const periodMatches = [...trimmed.matchAll(periodRegex)];

		if (periodMatches.length > 0) {
			let lastIndex = 0;

			for (const match of periodMatches) {
				const pos = match.index!;
				const beforePeriod = trimmed.substring(lastIndex, pos).trim();
				if (beforePeriod) {
					const dotText = `${beforePeriod}.`;
					// Nếu Dot đạt điều kiện, thêm vào segments
					if (dotText.length <= minLength) {
						segments.push({
							text: dotText,
							type: "dot",
							id: generateUUID(),
						});
					} else {
						// Nếu Dot không đạt, tiếp tục xử lý (split theo dấu phẩy hoặc khoảng trắng)
						const subSegments = processCommaOrSpace(dotText);
						segments.push(...subSegments);
					}
				}
				lastIndex = pos + 1;
			}

			// Phần còn lại sau dấu chấm cuối cùng
			const remaining = trimmed.substring(lastIndex).trim();
			if (remaining) {
				if (remaining.length <= minLength) {
					// Phần còn lại không có dấu chấm, kiểm tra dấu phẩy để xác định type
					const commaRegex = /,(?=\s|$)/g;
					if (commaRegex.test(remaining)) {
						// Có dấu phẩy nhưng đạt điều kiện, tạo CommaSegment
						segments.push({
							text: remaining,
							type: "comma",
							id: generateUUID(),
						});
					} else {
						// Không có dấu phẩy, tạo SpaceSegment
						segments.push({
							text: remaining,
							type: "space",
							id: generateUUID(),
						});
					}
				} else {
					// Phần còn lại dài hơn, tiếp tục xử lý
					const subSegments = processCommaOrSpace(remaining);
					segments.push(...subSegments);
				}
			}

			return segments;
		}

		// Bước 2: Không có dấu chấm, thử split theo dấu phẩy
		return processCommaOrSpace(trimmed);
	}

	/**
	 * Xử lý split theo dấu phẩy hoặc khoảng trắng
	 */
	function processCommaOrSpace(segmentText: string): ParagraphChildSegment[] {
		const trimmed = segmentText.trim();
		if (!trimmed) return [];

		// Nếu đoạn đã đạt yêu cầu, trả về SpaceSegment (vì không có dấu chấm/phẩy)
		if (trimmed.length <= minLength) {
			return [{ text: trimmed, type: "space", id: generateUUID() }];
		}

		const segments: ParagraphChildSegment[] = [];
		const commaRegex = /,(?=\s|$)/g;
		const commaMatches = [...trimmed.matchAll(commaRegex)];

		if (commaMatches.length > 0) {
			let lastIndex = 0;

			for (const match of commaMatches) {
				const pos = match.index!;
				const beforeComma = trimmed.substring(lastIndex, pos).trim();
				if (beforeComma) {
					const commaText = `${beforeComma},`;
					// Nếu Comma đạt điều kiện, thêm vào segments
					if (commaText.length <= minLength) {
						segments.push({
							text: commaText,
							type: "comma",
							id: generateUUID(),
						});
					} else {
						// Nếu Comma không đạt, tiếp tục split theo khoảng trắng
						const spaceSegments = processSpaceOnly(commaText);
						segments.push(...spaceSegments);
					}
				}
				lastIndex = pos + 1;
			}

			// Phần còn lại sau dấu phẩy cuối cùng
			const remaining = trimmed.substring(lastIndex).trim();
			if (remaining) {
				if (remaining.length <= minLength) {
					// Phần còn lại đạt điều kiện, tạo SpaceSegment
					segments.push({
						text: remaining,
						type: "space",
						id: generateUUID(),
					});
				} else {
					const spaceSegments = processSpaceOnly(remaining);
					segments.push(...spaceSegments);
				}
			}

			return segments;
		}

		// Bước 3: Không có dấu phẩy, split theo khoảng trắng
		return processSpaceOnly(trimmed);
	}

	/**
	 * Xử lý split theo khoảng trắng (tạo SpaceSegment)
	 */
	function processSpaceOnly(segmentText: string): SpaceSegment[] {
		const trimmed = segmentText.trim();
		if (!trimmed) return [];

		if (trimmed.length <= minLength) {
			return [{ text: trimmed, type: "space", id: generateUUID() }];
		}

		const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

		if (words.length === 0) {
			return [{ text: trimmed, type: "space", id: generateUUID() }];
		}

		const spaceSegments: SpaceSegment[] = [];
		let currentChunk = "";

		for (const word of words) {
			const testChunk = currentChunk ? `${currentChunk} ${word}` : word;

			if (testChunk.length <= minLength - 1) {
				currentChunk = testChunk;
			} else {
				if (currentChunk) {
					spaceSegments.push({
						text: currentChunk,
						type: "space",
						id: generateUUID(),
					});
				}
				currentChunk = word;
			}
		}

		if (currentChunk) {
			spaceSegments.push({
				text: currentChunk,
				type: "space",
				id: generateUUID(),
			});
		}

		return spaceSegments;
	}

	/**
	 * Xử lý các đoạn Paragraph (split theo \n)
	 */
	function processParagraphSegments(fullText: string): ParagraphSegment[] {
		const trimmed = fullText.trim();
		if (!trimmed) return [];

		// Split theo \n để tạo mảng Paragraph
		const paragraphSegments = trimmed
			.split("\n")
			.filter((seg) => seg.trim().length > 0);

		return paragraphSegments.map((paragraph) => {
			const trimmedParagraph = paragraph.trim();

			// Nếu Paragraph đã đạt yêu cầu, không tạo con
			if (trimmedParagraph.length <= minLength) {
				return {
					text: trimmedParagraph,
					type: "paragraph" as const,
					segments: [],
					id: generateUUID(),
				};
			}

			// Nếu Paragraph dài hơn, tiếp tục split
			const segments = processSegment(trimmedParagraph);
			return {
				text: trimmedParagraph,
				type: "paragraph" as const,
				segments,
				id: generateUUID(),
			};
		});
	}

	// Bắt đầu xử lý từ đoạn text gốc
	return processParagraphSegments(text);
}
