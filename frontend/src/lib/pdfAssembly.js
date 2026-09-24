import { PDFDocument } from "pdf-lib";

// Client-side multi-file -> single PDF assembly. Used by both "combine
// several files into one mock test" (UploadPdfPanel always, CreateMockTestModal
// in "combine" mode) and "batch create one mock test per file" (CreateMockTestModal
// in "batch" mode - each file still needs image->PDF conversion even when
// it isn't being merged with anything else, via ensureSingleFileIsPdf
// below). Either way, the backend/worker pipeline (upload-url/upload-complete,
// worker.py, pdf_extract.py, the whole vision/diagram-crop stack) never
// has to change or even know images were involved - everything downstream
// of this file only ever sees a single valid PDF, exactly like it always
// has.
//
// Every image file, regardless of its original format (jpg/png/webp/gif/
// etc - whatever the browser can decode), is normalized through an
// offscreen canvas and re-encoded as PNG before being embedded. That's
// what lets one code path handle any browser-decodable image type instead
// of hand-rolling per-format embedding - pdf-lib itself only natively
// embeds JPEG and PNG bytes directly. HEIC (iPhone photos) decodes on
// Safari but not Chrome/Firefox as of this writing; unsupported files
// throw a clear per-file error rather than silently producing a blank
// page.

// Not a hard platform limit - just a sanity check on the combined output,
// since the direct-to-B2 upload path (unlike the legacy multer route) has
// no server-side size cap of its own to catch a runaway merge.
export const MAX_MERGED_PDF_BYTES = 40 * 1024 * 1024;

export class PdfAssemblyError extends Error {
  constructor(message, fileName) {
    super(message);
    this.name = "PdfAssemblyError";
    this.fileName = fileName;
  }
}

export function isPdfFile(file) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export function isImageFile(file) {
  return file.type.startsWith("image/");
}

const OFFICE_DOC_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const OFFICE_DOC_EXTENSIONS = [".doc", ".docx", ".ppt", ".pptx"];

// Word/PowerPoint files - matches the accept list on the file input in
// CreateMockTestUploadPanel.jsx. Never routed through pdf-lib
// (mergeFilesToPdf/ensureSingleFileIsPdf only understand PDF and image
// bytes; an Office file would hit their "isn't a PDF or image file"
// branch and throw). Only meaningful for the single-file pass-through
// case in useCreateMockTestForm.js - a lone Office doc goes straight to
// the backend as-is, same as a lone PDF, and is out of scope for
// combine/batch assembly, which stays PDF+image only.
export function isOfficeDocFile(file) {
  return (
    OFFICE_DOC_MIME_TYPES.has(file.type) ||
    OFFICE_DOC_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

// Decodes any browser-supported image format via an offscreen canvas and
// re-encodes it as PNG bytes, so appendImagePage below only ever deals
// with one image format regardless of what the user actually selected.
async function normalizeImageToPngBytes(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PdfAssemblyError(
      `"${file.name}" isn't a format this browser can read as an image ` +
        `(HEIC photos from iPhones often only decode in Safari - try ` +
        `converting it to JPG/PNG first).`,
      file.name,
    );
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      throw new PdfAssemblyError(
        `Could not convert "${file.name}" to an image page.`,
        file.name,
      );
    }
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close?.();
  }
}

// Appends one page per image, sized to the image's own pixel dimensions
// (a photographed page rendered at whatever resolution it was captured
// at) rather than forcing a fixed A4/Letter box with scaling - simplest
// option, and matches what a "photo of a page" already looks like.
async function appendImagePage(pdfDoc, file) {
  const pngBytes = await normalizeImageToPngBytes(file);
  const image = await pdfDoc.embedPng(pngBytes);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });
}

async function appendPdfPages(pdfDoc, file) {
  let sourceDoc;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    sourceDoc = await PDFDocument.load(bytes);
  } catch (error) {
    throw new PdfAssemblyError(
      `"${file.name}" doesn't look like a valid PDF (${error.message}).`,
      file.name,
    );
  }
  const copiedPages = await pdfDoc.copyPages(
    sourceDoc,
    sourceDoc.getPageIndices(),
  );
  copiedPages.forEach((page) => pdfDoc.addPage(page));
}

// Merges an ordered list of File objects (PDFs and/or images, in the
// order they should appear) into ONE PDF File.
export async function mergeFilesToPdf(
  files,
  { outputName = "combined.pdf" } = {},
) {
  if (!files || files.length === 0) {
    throw new PdfAssemblyError("No files to combine.");
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    if (isPdfFile(file)) {
      await appendPdfPages(pdfDoc, file);
    } else if (isImageFile(file)) {
      await appendImagePage(pdfDoc, file);
    } else {
      throw new PdfAssemblyError(
        `"${file.name}" isn't a PDF or image file.`,
        file.name,
      );
    }
  }

  const bytes = await pdfDoc.save();
  if (bytes.byteLength > MAX_MERGED_PDF_BYTES) {
    throw new PdfAssemblyError(
      `Combined PDF is ${(bytes.byteLength / (1024 * 1024)).toFixed(1)}MB, over the ` +
        `${MAX_MERGED_PDF_BYTES / (1024 * 1024)}MB limit. Try removing a file or ` +
        `splitting into more than one mock test.`,
    );
  }

  return new File([bytes], outputName, { type: "application/pdf" });
}

// Batch mode still needs every individual file to become a valid PDF
// (never a raw image) before it reaches the existing upload flow - a
// single-file "merge" of one file does exactly that: converts a lone
// image to a one-page PDF, or passes a lone PDF through unchanged (still
// round-tripped through pdf-lib so the same size check applies either way).
export function ensureSingleFileIsPdf(file) {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "document";
  return mergeFilesToPdf([file], { outputName: `${baseName}.pdf` });
}
