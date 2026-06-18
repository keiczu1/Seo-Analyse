import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import fs from 'fs';
import path from 'path';

// Define invisible border configuration
const borderNone = {
    style: BorderStyle.NONE,
    size: 0,
    color: "auto",
};

const invisibleBorders = {
    top: borderNone,
    bottom: borderNone,
    left: borderNone,
    right: borderNone,
    insideHorizontal: borderNone,
    insideVertical: borderNone,
};

// Main document definition
const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // 1. Right-Aligned Invisible Table for the Court/Plaintiff/Defendant header info
            new Table({
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
                borders: invisibleBorders,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: {
                                    size: 50,
                                    type: WidthType.PERCENTAGE,
                                },
                                children: [],
                            }),
                            new TableCell({
                                width: {
                                    size: 50,
                                    type: WidthType.PERCENTAGE,
                                },
                                children: [
                                    new Paragraph({
                                        spacing: { after: 60, line: 240 },
                                        children: [
                                            new TextRun({ text: "Мировому судье судебного участка № ", font: "Times New Roman", size: 22 }),
                                            new TextRun({ text: "[Номер]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60, line: 240 },
                                        children: [
                                            new TextRun({ text: "[Района / города]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 120, line: 240 },
                                        children: [
                                            new TextRun({ text: "Адрес: ", font: "Times New Roman", size: 22 }),
                                            new TextRun({ text: "[Адрес суда]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60, line: 240 },
                                        children: [
                                            new TextRun({ text: "Истец: ", font: "Times New Roman", size: 22, bold: true }),
                                            new TextRun({ text: "[Ваше ФИО]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60, line: 240 },
                                        children: [
                                            new TextRun({ text: "Адрес: ", font: "Times New Roman", size: 22 }),
                                            new TextRun({ text: "[Ваш адрес проживания]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 120, line: 240 },
                                        children: [
                                            new TextRun({ text: "Телефон: ", font: "Times New Roman", size: 22 }),
                                            new TextRun({ text: "[Ваш телефон]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60, line: 240 },
                                        children: [
                                            new TextRun({ text: "Ответчик: ", font: "Times New Roman", size: 22, bold: true }),
                                            new TextRun({ text: "[ФИО жены]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60, line: 240 },
                                        children: [
                                            new TextRun({ text: "Адрес: ", font: "Times New Roman", size: 22 }),
                                            new TextRun({ text: "[Адрес проживания жены]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 120, line: 240 },
                                        children: [
                                            new TextRun({ text: "Телефон: ", font: "Times New Roman", size: 22 }),
                                            new TextRun({ text: "[Телефон жены]", font: "Times New Roman", size: 22, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 240, line: 240 },
                                        children: [
                                            new TextRun({ text: "Госпошлина: 5 000 рублей", font: "Times New Roman", size: 22 }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),

            // 2. Centered Bold Title
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 60, line: 360 },
                children: [
                    new TextRun({
                        text: "ИСКОВОЕ ЗАЯВЛЕНИЕ",
                        font: "Times New Roman",
                        size: 26,
                        bold: true,
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 240, line: 360 },
                children: [
                    new TextRun({
                        text: "о расторжении брака",
                        font: "Times New Roman",
                        size: 26,
                        bold: true,
                    }),
                ],
            }),

            // 3. Body Text (with 1.25cm/709twips first line indentation, justified, 1.5 line spacing)
            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                indent: { firstLine: 709 },
                spacing: { before: 0, after: 120, line: 360 },
                children: [
                    new TextRun({ text: "«", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "__", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: "» ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "___________", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: " ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "____", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: " г. между мной и Ответчиком ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "[ФИО жены]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: " был зарегистрирован брак в ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "[Наименование ЗАГС]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: ", актовая запись № ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "[Номер записи]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: ".", font: "Times New Roman", size: 24 }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                indent: { firstLine: 709 },
                spacing: { before: 0, after: 120, line: 360 },
                children: [
                    new TextRun({ text: "От данного брака несовершеннолетних детей нет ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "(если дети есть, дело подается в районный суд, укажите ФИО и даты рождения детей)", font: "Times New Roman", size: 24, italic: true }),
                    new TextRun({ text: ".", font: "Times New Roman", size: 24 }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                indent: { firstLine: 709 },
                spacing: { before: 0, after: 120, line: 360 },
                children: [
                    new TextRun({ text: "Совместная жизнь с Ответчиком не сложилась, брачные отношения прекращены с ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "[Месяц, год]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: " г. С указанного времени совместное хозяйство не ведется, проживаем раздельно. Примирение невозможно, Ответчик согласия на расторжение брака через ЗАГС не дает.", font: "Times New Roman", size: 24 }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                indent: { firstLine: 709 },
                spacing: { before: 0, after: 120, line: 360 },
                children: [
                    new TextRun({ text: "Споров о разделе имущества, являющегося совместной собственностью, не имеется.", font: "Times New Roman", size: 24 }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                indent: { firstLine: 709 },
                spacing: { before: 0, after: 120, line: 360 },
                children: [
                    new TextRun({ text: "В соответствии со ст. 21, 22 Семейного кодекса РФ, статьями 131, 132 Гражданского процессуального кодекса РФ,", font: "Times New Roman", size: 24 }),
                ],
            }),

            // 4. Request word: PROSHU
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120, line: 360 },
                children: [
                    new TextRun({
                        text: "ПРОШУ:",
                        font: "Times New Roman",
                        size: 24,
                        bold: true,
                    }),
                ],
            }),

            // 5. Request Paragraph
            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                indent: { firstLine: 709 },
                spacing: { before: 0, after: 240, line: 360 },
                children: [
                    new TextRun({ text: "Брак между мной и Ответчиком ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "[ФИО жены]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: ", зарегистрированный «", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "__", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: "» ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "___________", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: " ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "____", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: " г. в ", font: "Times New Roman", size: 24 }),
                    new TextRun({ text: "[Наименование ЗАГС]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                    new TextRun({ text: ", расторгнуть.", font: "Times New Roman", size: 24 }),
                ],
            }),

            // 6. Attachments Header
            new Paragraph({
                alignment: AlignmentType.JUSTIFY,
                spacing: { before: 120, after: 80, line: 360 },
                children: [
                    new TextRun({ text: "Приложения:", font: "Times New Roman", size: 24, bold: true }),
                ],
            }),

            // 7. Attachments list (hanging indent: 360 twips left, -360 twips first line for numbering)
            ...[
                "Копия уведомления о вручении или иных документов, подтверждающих направление Ответчику копии искового заявления и приложенных к нему документов.",
                "Документ, подтверждающий оплату государственной пошлины (квитанция).",
                "Оригинал свидетельства о заключении брака.",
                "Копии свидетельств о рождении детей (при наличии)."
            ].map((item, index) => {
                return new Paragraph({
                    alignment: AlignmentType.JUSTIFY,
                    indent: { left: 360, hanging: 360 },
                    spacing: { before: 0, after: 80, line: 360 },
                    children: [
                        new TextRun({ text: `${index + 1}. `, font: "Times New Roman", size: 24 }),
                        new TextRun({ text: item, font: "Times New Roman", size: 24 }),
                    ],
                });
            }),

            // 8. Signature table (in one line, left aligned name/signature and right aligned date)
            new Table({
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
                borders: invisibleBorders,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: {
                                    size: 60,
                                    type: WidthType.PERCENTAGE,
                                },
                                children: [
                                    new Paragraph({
                                        spacing: { before: 360, after: 0 },
                                        children: [
                                            new TextRun({ text: "Истец: ___________ / ", font: "Times New Roman", size: 24 }),
                                            new TextRun({ text: "[ФИО]", font: "Times New Roman", size: 24, bold: true, color: "B45309" }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableCell({
                                width: {
                                    size: 40,
                                    type: WidthType.PERCENTAGE,
                                },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        spacing: { before: 360, after: 0 },
                                        children: [
                                            new TextRun({ text: "«___» _________ 2026 г.", font: "Times New Roman", size: 24 }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    }],
});

// Pack doc and write to disk
Packer.toBuffer(doc).then((buffer) => {
    const outputPath = path.join('d:\\Git\\Keiczu1\\Seo Analyse\\Gemini', 'isk-razvod.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Successfully generated DOCX at: ${outputPath}`);
}).catch(err => {
    console.error("Failed to generate DOCX:", err);
    process.exit(1);
});
