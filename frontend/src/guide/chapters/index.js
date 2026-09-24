import { welcome } from "./welcome";
import { cluster } from "./cluster";
import { addMockTest } from "./addMockTest";
import { wizard } from "./wizard";
import { processing } from "./processing";
import { review } from "./review";

// Order here IS tour order - GuideProvider walks this array when
// auto-advancing from one completed/skipped chapter into the next.
export const CHAPTERS = [
  welcome,
  cluster,
  addMockTest,
  wizard,
  processing,
  review,
];

export const CHAPTERS_BY_ID = Object.fromEntries(
  CHAPTERS.map((chapter) => [chapter.id, chapter]),
);
