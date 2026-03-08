import { Request, Response } from "express";
import { AppDataSource } from "../datasource";
import { Quiz } from "../entities/Quiz";
import { QuizCategory } from "../entities/QuizCategory";
import { QuizChoice } from "../entities/QuizChoice";
import { QuizTag } from "../entities/QuizTag";
import { QuizTagging } from "../entities/QuizTagging";

const CSV_HEADERS = [
  "category_slug",
  "quiz_slug",
  "question",
  "explanation",
  "choice_text",
  "is_correct",
  "choice_order",
  "tags",
] as const;

interface CsvRow {
  category_slug: string;
  quiz_slug: string;
  question: string;
  explanation: string;
  choice_text: string;
  is_correct: string;
  choice_order: string;
  tags: string;
}

function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function toCsvString(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\r") {
        // skip, handle \n next
      } else if (ch === "\n") {
        row.push(current.trim());
        current = "";
        if (row.some((cell) => cell !== "")) {
          rows.push(row);
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }
  // last field / last row
  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0]!;
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]!] = r[i] ?? "";
    }
    return obj as unknown as CsvRow;
  });
}

export class QuizCsvController {
  async sampleCsv(_req: Request, res: Response): Promise<void> {
    const sample: string[][] = [
      CSV_HEADERS as unknown as string[],
      ["javascript", "js-var-let", "letとconstの違いは何ですか？", "letは再代入可能、constは再代入不可の変数宣言です。", "letは再代入可能でconstは不可", "true", "1", "es6|variables"],
      ["javascript", "js-var-let", "letとconstの違いは何ですか？", "letは再代入可能、constは再代入不可の変数宣言です。", "どちらも再代入可能", "false", "2", "es6|variables"],
      ["javascript", "js-var-let", "letとconstの違いは何ですか？", "letは再代入可能、constは再代入不可の変数宣言です。", "どちらも再代入不可", "false", "3", "es6|variables"],
      ["javascript", "js-var-let", "letとconstの違いは何ですか？", "letは再代入可能、constは再代入不可の変数宣言です。", "letはグローバルスコープのみ", "false", "4", "es6|variables"],
      ["javascript", "js-arrow-fn", "アロー関数の特徴として正しいものは？", "アロー関数は自身のthisを持たず、外側のスコープのthisを参照します。", "自身のthisを持たない", "true", "1", "es6|functions"],
      ["javascript", "js-arrow-fn", "アロー関数の特徴として正しいものは？", "アロー関数は自身のthisを持たず、外側のスコープのthisを参照します。", "argumentsオブジェクトを持つ", "false", "2", "es6|functions"],
      ["javascript", "js-arrow-fn", "アロー関数の特徴として正しいものは？", "アロー関数は自身のthisを持たず、外側のスコープのthisを参照します。", "コンストラクタとして使用できる", "false", "3", "es6|functions"],
    ];

    const csv = toCsvString(sample);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="quiz_import_sample.csv"',
    );
    res.send("\uFEFF" + csv);
  }

  async exportCsv(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.category_id
        ? Number(req.query.category_id)
        : undefined;

      const quizRepo = AppDataSource.getRepository(Quiz);
      let qb = quizRepo
        .createQueryBuilder("quiz")
        .innerJoinAndSelect("quiz.category", "category")
        .leftJoinAndSelect("quiz.choices", "choice")
        .orderBy("quiz.id", "ASC")
        .addOrderBy("choice.displayOrder", "ASC");

      if (categoryId && Number.isFinite(categoryId)) {
        qb = qb.where("quiz.categoryId = :categoryId", { categoryId });
      }

      const quizzes = await qb.getMany();

      const taggingRepo = AppDataSource.getRepository(QuizTagging);
      const quizIds = quizzes.map((q) => q.id);
      const taggings =
        quizIds.length > 0
          ? await taggingRepo.find({
              where: quizIds.map((id) => ({ quizId: id })),
              relations: ["quizTag"],
            })
          : [];

      const tagsByQuizId = new Map<number, string[]>();
      for (const t of taggings) {
        const arr = tagsByQuizId.get(t.quizId) ?? [];
        arr.push(t.quizTag.slug);
        tagsByQuizId.set(t.quizId, arr);
      }

      const rows: string[][] = [CSV_HEADERS as unknown as string[]];
      for (const quiz of quizzes) {
        const choices = (quiz.choices ?? []).sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        );
        const tagsStr = (tagsByQuizId.get(quiz.id) ?? []).join("|");

        if (choices.length === 0) {
          rows.push([
            quiz.category.slug,
            quiz.slug,
            quiz.question,
            quiz.explanation ?? "",
            "",
            "",
            "",
            tagsStr,
          ]);
        } else {
          for (const choice of choices) {
            rows.push([
              quiz.category.slug,
              quiz.slug,
              quiz.question,
              quiz.explanation ?? "",
              choice.choiceText,
              choice.isCorrect ? "true" : "false",
              String(choice.displayOrder ?? ""),
              tagsStr,
            ]);
          }
        }
      }

      const csv = toCsvString(rows);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="quizzes_${Date.now()}.csv"`,
      );
      // BOM を付けて Excel で文字化けしないようにする
      res.send("\uFEFF" + csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async importCsv(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (userId == null) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { csv } = req.body as { csv?: string };
      if (!csv) {
        res.status(400).json({ error: "CSV data is required" });
        return;
      }

      // BOM を除去
      let csvContent = csv;
      if (csvContent.charCodeAt(0) === 0xfeff) {
        csvContent = csvContent.slice(1);
      }

      const records = parseCsv(csvContent);

      if (records.length === 0) {
        res.status(400).json({ error: "CSV file is empty" });
        return;
      }

      // quiz_slug でグループ化
      const quizGroups = new Map<
        string,
        { row: CsvRow; choices: CsvRow[] }
      >();
      for (const row of records) {
        if (!row.quiz_slug || !row.category_slug || !row.question) {
          continue;
        }
        const existing = quizGroups.get(row.quiz_slug);
        if (existing) {
          if (row.choice_text) {
            existing.choices.push(row);
          }
        } else {
          quizGroups.set(row.quiz_slug, {
            row,
            choices: row.choice_text ? [row] : [],
          });
        }
      }

      if (quizGroups.size === 0) {
        res.status(400).json({ error: "No valid quiz data found in CSV" });
        return;
      }

      const categoryRepo = AppDataSource.getRepository(QuizCategory);
      const quizRepo = AppDataSource.getRepository(Quiz);
      const choiceRepo = AppDataSource.getRepository(QuizChoice);
      const tagRepo = AppDataSource.getRepository(QuizTag);
      const taggingRepo = AppDataSource.getRepository(QuizTagging);

      // カテゴリーをキャッシュ
      const allCategories = await categoryRepo.find();
      const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c]));

      // タグをキャッシュ
      const allTags = await tagRepo.find();
      const tagBySlug = new Map(allTags.map((t) => [t.slug, t]));

      const created: string[] = [];
      const updated: string[] = [];
      const errors: string[] = [];
      const createdTags: string[] = [];

      for (const [slug, group] of quizGroups) {
        const { row, choices } = group;

        const category = categoryBySlug.get(row.category_slug);
        if (!category) {
          errors.push(`${slug}: カテゴリー "${row.category_slug}" が見つかりません`);
          continue;
        }

        if (choices.length === 0) {
          errors.push(`${slug}: 選択肢がありません`);
          continue;
        }

        let quiz = await quizRepo.findOne({ where: { slug } });
        const isUpdate = !!quiz;

        if (quiz) {
          quiz.categoryId = category.id;
          quiz.question = row.question;
          quiz.explanation = row.explanation || "";
          await quizRepo.save(quiz);

          // 既存の選択肢とタグ紐付けを削除して再作成
          await choiceRepo.delete({ quizId: quiz.id });
          await taggingRepo.delete({ quizId: quiz.id });
        } else {
          quiz = quizRepo.create({
            slug,
            categoryId: category.id,
            authorId: userId,
            question: row.question,
            ...(row.explanation ? { explanation: row.explanation } : {}),
          });
          await quizRepo.save(quiz);
        }

        for (let i = 0; i < choices.length; i++) {
          const c = choices[i]!;
          const choice = choiceRepo.create({
            quizId: quiz.id,
            choiceText: c.choice_text,
            isCorrect: c.is_correct?.toLowerCase() === "true",
            displayOrder: c.choice_order ? Number(c.choice_order) : i + 1,
          });
          await choiceRepo.save(choice);
        }

        // タグの処理（パイプ区切り）
        const tagSlugs = row.tags
          ? row.tags
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        for (const tagSlug of tagSlugs) {
          let tag = tagBySlug.get(tagSlug);
          if (!tag) {
            tag = tagRepo.create({ slug: tagSlug, name: tagSlug });
            await tagRepo.save(tag);
            tagBySlug.set(tagSlug, tag);
            createdTags.push(tagSlug);
          }
          const tagging = taggingRepo.create({
            quizId: quiz.id,
            quizTagId: tag.id,
          });
          await taggingRepo.save(tagging);
        }

        if (isUpdate) {
          updated.push(slug);
        } else {
          created.push(slug);
        }
      }

      res.status(200).json({
        message: `インポート完了`,
        created_count: created.length,
        updated_count: updated.length,
        error_count: errors.length,
        created_tags_count: createdTags.length,
        created,
        updated,
        errors,
        created_tags: createdTags,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
